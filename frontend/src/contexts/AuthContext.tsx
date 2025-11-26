import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_REFRESH_EVENT,
  broadcastTokenRefresh,
  getTokenExpiration,
  isTokenExpiringWithin,
} from "@/lib/auth/tokenUtils";
import { API_BASE_URL } from "@/lib/api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  waitlisted: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  guestModeEnabled: boolean;
  login: (provider: "google" | "github") => void;
  logout: () => void;
  refreshUser: (tokenOverride?: string | null) => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Guest user data
const GUEST_USER: User = {
  id: "guest-user",
  email: "guest@pixie.local",
  name: "Guest User",
  avatar_url: null,
  waitlisted: false,  // Guest users are not waitlisted
};

const GUEST_TOKEN = "guest-token";
const REFRESH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestModeEnabled, setGuestModeEnabled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for token refresh events triggered outside this context (e.g., API client)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ accessToken: string | null }>).detail;
      if (!detail) {
        return;
      }

      if (detail.accessToken) {
        setToken(detail.accessToken);
      } else if (detail.accessToken === null) {
        setToken(null);
        setUser(null);
      }
    };

    const eventHandler = handler as EventListener;
    window.addEventListener(TOKEN_REFRESH_EVENT, eventHandler);
    return () => window.removeEventListener(TOKEN_REFRESH_EVENT, eventHandler);
  }, []);

  // Fetch guest mode status from backend on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/public/config`);
        
        if (response.ok) {
          const config = await response.json();
          setGuestModeEnabled(config.guest_mode_enabled || false);
          
          if (config.guest_mode_enabled) {
            // Guest mode: automatically set guest user and token
            setUser(GUEST_USER);
            setToken(GUEST_TOKEN);
            localStorage.setItem(AUTH_TOKEN_KEY, GUEST_TOKEN);
            broadcastTokenRefresh(GUEST_TOKEN);
            setIsLoading(false);
          } else {
            // Normal mode: load tokens from localStorage
            const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
            if (storedToken) {
              setToken(storedToken);
            }
            setIsLoading(false);
          }
        } else {
          // If config endpoint fails, assume normal mode
          const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
          if (storedToken) {
            setToken(storedToken);
          }
          setIsLoading(false);
        }
      } catch (error) {
        // If config endpoint fails, assume normal mode
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
        }
        setIsLoading(false);
      }
    };
    
    fetchConfig();
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    // Guest mode: no refresh needed
    if (guestModeEnabled) {
      return true;
    }

    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!storedRefreshToken) {
      // No refresh token, user needs to login
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setUser(null);
       broadcastTokenRefresh(null);
      return false;
    }

    const apiUrl = `${API_BASE_URL}/api/v1/public/auth/refresh?refresh_token=${encodeURIComponent(storedRefreshToken)}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        setToken(data.access_token);
        broadcastTokenRefresh(data.access_token);
        return true;
      } else {
        // Refresh token is invalid or expired
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        broadcastTokenRefresh(null);
        return false;
      }
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return false;
    }
  }, [guestModeEnabled]);

  const refreshUser = useCallback(async (tokenOverride?: string | null) => {
    const tokenToUse = tokenOverride || token;
    
    if (!tokenToUse) {
      setUser(null);
      return;
    }

    // Guest mode: don't fetch from API, just use guest user
    if (guestModeEnabled && tokenToUse === GUEST_TOKEN) {
      setUser(GUEST_USER);
      return;
    }

    // In guest mode, don't try to fetch user from API
    if (guestModeEnabled) {
      return;
    }

    const apiUrl = `${API_BASE_URL}/api/v1/public/auth/me`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshAccessToken();
        if (refreshed && token) {
          // Retry with new token
          const newToken = localStorage.getItem(AUTH_TOKEN_KEY);
          if (newToken) {
            const retryResponse = await fetch(apiUrl, {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            if (retryResponse.ok) {
              const userData = await retryResponse.json();
              setUser(userData);
            }
          }
        } else {
          // Refresh failed, clear tokens
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setToken(null);
          setUser(null);
          broadcastTokenRefresh(null);
        }
      } else {
        // Other error, clear tokens
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setUser(null);
        broadcastTokenRefresh(null);
      }
    } catch (error) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      broadcastTokenRefresh(null);
    }
  }, [token, guestModeEnabled, refreshAccessToken]);

  // Handle OAuth callback - check for token in URL
  useEffect(() => {
    if (location.pathname === "/auth/callback") {
      const params = new URLSearchParams(location.search);
      const tokenParam = params.get("token");
      const refreshTokenParam = params.get("refresh_token");
      const errorParam = params.get("error");
      
      if (errorParam) {
        return;
      }
      
      if (tokenParam) {
        localStorage.setItem(AUTH_TOKEN_KEY, tokenParam);
        setToken(tokenParam);
        broadcastTokenRefresh(tokenParam);
        
        // Store refresh token if provided
        if (refreshTokenParam) {
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenParam);
        }
        
        // Immediately fetch user info with the new token
        refreshUser(tokenParam).catch(() => {
          // Silently handle errors
        });
      }
    }
  }, [location, refreshUser]);

  // Fetch user info when token is available (for non-callback scenarios or after callback)
  useEffect(() => {
    if (token && !user) {
      refreshUser();
    }
  }, [token, user, location.pathname, refreshUser]);

  // Guest mode: ensure user is set
  useEffect(() => {
    if (guestModeEnabled && !user && token === GUEST_TOKEN) {
      setUser(GUEST_USER);
    }
  }, [user, token, guestModeEnabled]);

  // Set up automatic token refresh
  useEffect(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Guest mode: no auto-refresh needed
    if (guestModeEnabled || !token) {
      return;
    }

    const handleRefresh = () => {
      refreshAccessToken().then((success) => {
        if (success) {
          const newToken = localStorage.getItem(AUTH_TOKEN_KEY);
          if (newToken) {
            refreshUser(newToken);
          }
        }
      });
    };

    // Refresh immediately if within the proactive window
    if (isTokenExpiringWithin(token, REFRESH_WINDOW_MS)) {
      handleRefresh();
    } else {
      // Schedule refresh REFRESH_WINDOW_MS before expiration
      const exp = getTokenExpiration(token);
      if (exp) {
        const now = Date.now();
        const timeUntilExpiration = exp - now;
        const refreshTime = timeUntilExpiration - REFRESH_WINDOW_MS;
        
        if (refreshTime > 0) {
          refreshTimeoutRef.current = setTimeout(handleRefresh, refreshTime);
        } else {
          handleRefresh();
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, guestModeEnabled, refreshAccessToken, refreshUser]);

  const login = async (provider: "google" | "github") => {
    // Guest mode: no login needed
    if (guestModeEnabled) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/public/auth/login/${provider}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        alert(`Failed to initiate login: ${errorText}`);
        return;
      }
      
      const data = await response.json();
      if (data.url) {
        // Redirect to the OAuth provider's authorization page
        window.location.href = data.url;
      } else {
        alert("Failed to get OAuth URL from server");
      }
    } catch (error) {
      alert("Failed to connect to authentication server");
    }
  };

  const logout = () => {
    // Prevent logout if guest mode is enabled
    if (guestModeEnabled) {
      return;
    }
    
    // Clear refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    broadcastTokenRefresh(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, guestModeEnabled, login, logout, refreshUser, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

