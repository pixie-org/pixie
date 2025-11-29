import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JsonEditor } from '@/components/JsonEditor';
import { JsonViewer } from '@/components/JsonViewer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  type ToolDetailResponse, 
  type ToolkitSourceDetail,
  inferToolOutputSchema,
  updateTool,
} from '@/lib/api/tools';
import { useConnection } from '@/lib/mcp/hooks/useConnection';
import { DEFAULT_INSPECTOR_CONFIG } from '@/lib/mcp/constants';
import type { InspectorConfig } from '@/lib/mcp/configurationTypes';
import type { CustomHeaders } from '@/lib/mcp/types/customHeaders';
import { recordToHeaders } from '@/lib/mcp/types/customHeaders';
import { waitForOAuthToken } from '@/lib/mcp/utils/oauthUtils';

interface InferOutputSchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolId: string;
  toolDetails: ToolDetailResponse;
  toolkitSource: ToolkitSourceDetail;
  projectId: string;
  onSchemaUpdated?: () => void;
}

interface ConnectionConfig {
    url: string;
    transportType: "streamable-http";
    customHeaders: CustomHeaders;
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthScope?: string;
    config: InspectorConfig;
}

// Helper: Create connection config from toolkit source
const createConnectionConfig = (toolkitSource: ToolkitSourceDetail | null): ConnectionConfig | null => {
  if (!toolkitSource) return null;

    const config: InspectorConfig = { ...DEFAULT_INSPECTOR_CONFIG };
  if (toolkitSource.configuration.request_timeout) {
      config.MCP_SERVER_REQUEST_TIMEOUT = {
        ...config.MCP_SERVER_REQUEST_TIMEOUT,
      value: toolkitSource.configuration.request_timeout * 1000,
      };
    }

  const customHeadersObj: Record<string, string> = toolkitSource.configuration.custom_headers || {};
    const customHeaders: CustomHeaders = recordToHeaders(customHeadersObj);

  const authConfig = toolkitSource.configuration.auth_config;
    const oauthClientId = authConfig?.type === "oauth2" && authConfig.oauth2_client_id 
      ? authConfig.oauth2_client_id 
      : undefined;
    const oauthClientSecret = authConfig?.type === "oauth2" && authConfig.oauth2_client_secret 
      ? authConfig.oauth2_client_secret 
      : undefined;
    const oauthScope = authConfig?.type === "oauth2" && authConfig.oauth2_scope 
      ? authConfig.oauth2_scope.join(" ")
      : undefined;

    return {
    url: toolkitSource.configuration.server_url || "",
    transportType: (toolkitSource.configuration.transport as "streamable-http") || "streamable-http",
      customHeaders,
      oauthClientId,
      oauthClientSecret,
      oauthScope,
      config,
    };
};

// Helper: Generate default values from input schema
const generateDefaultParams = (inputSchema: unknown): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  
  if (!inputSchema || typeof inputSchema !== 'object' || !('properties' in inputSchema)) {
    return defaults;
  }

  const schema = inputSchema as Record<string, unknown>;
  const properties = schema.properties as Record<string, unknown>;
  const required = (schema.required as string[] | undefined) || [];
  
  for (const [key, prop] of Object.entries(properties)) {
    if (typeof prop !== 'object' || prop === null || !('type' in prop)) continue;
    
    const propSchema = prop as Record<string, unknown>;
    const propType = propSchema.type as string;
    const defaultValue = propSchema.default;
    
    if (defaultValue !== undefined) {
      defaults[key] = defaultValue;
    } else if (required.includes(key)) {
      const typeDefaults: Record<string, unknown> = {
        string: '',
        number: 0,
        integer: 0,
        boolean: false,
        array: [],
        object: {},
      };
      defaults[key] = typeDefaults[propType] ?? undefined;
    }
  }
  
  return defaults;
};

// Helper: Validate JSON schema text
const validateSchemaText = (text: string): string | null => {
  if (!text.trim()) return null;
  
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return 'Schema must be a valid JSON object';
    }
    return null;
  } catch {
    // Only show error if it looks like complete JSON
    if (text.trim().endsWith('}') || text.trim().endsWith(']')) {
      return 'Invalid JSON format';
    }
    return null;
  }
};

// Loading state component
const LoadingState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-8">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Form field component
interface FormFieldProps {
  name: string;
  schema: Record<string, unknown>;
  value: unknown;
  error?: string;
  required: boolean;
  onChange: (value: unknown) => void;
}

// FieldWrapper component - moved outside to prevent recreation on each render
const FieldWrapper = React.memo(({ children, description, error }: { 
  children: React.ReactNode;
  description?: string;
  error?: string;
}) => (
  <div className="space-y-2">
    {children}
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
));
FieldWrapper.displayName = 'FieldWrapper';

const FormField: React.FC<FormFieldProps> = React.memo(({ name, schema, value, error, required, onChange }) => {
  const type = schema.type as string;
  const description = schema.description as string | undefined;
  const title = schema.title as string | undefined;
  const label = title || name;
  const placeholder = description || `Enter ${label.toLowerCase()}`;

  switch (type) {
    case 'string': {
      const minLength = schema.minLength as number | undefined;
      const pattern = schema.pattern as string | undefined;
      return (
        <FieldWrapper description={description} error={error}>
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={name}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            minLength={minLength}
            pattern={pattern}
            className={error ? 'border-destructive' : ''}
          />
        </FieldWrapper>
      );
    }
    case 'number':
    case 'integer': {
      return (
        <FieldWrapper description={description} error={error}>
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={name}
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => {
              const numValue = type === 'integer' 
                ? parseInt(e.target.value, 10) 
                : parseFloat(e.target.value);
              onChange(isNaN(numValue) ? undefined : numValue);
            }}
            placeholder={placeholder}
            required={required}
            className={error ? 'border-destructive' : ''}
          />
        </FieldWrapper>
      );
    }
    case 'boolean': {
      return (
        <FieldWrapper description={description} error={error}>
          <div className="flex items-center gap-2">
            <input
              id={name}
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={name}>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        </FieldWrapper>
      );
    }
    default: {
      // Complex types (object, array) - JSON input
      const getTextareaValue = () => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value, null, 2);
          } catch {
            return String(value);
          }
        }
        return String(value);
      };

      return (
        <FieldWrapper description={description} error={error}>
          <Label htmlFor={name}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Textarea
            id={name}
            value={getTextareaValue()}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (!inputValue.trim()) {
                onChange(undefined);
                return;
              }
              try {
                onChange(JSON.parse(inputValue));
              } catch {
                onChange(inputValue);
              }
            }}
            placeholder={placeholder || 'Enter JSON...'}
            className={`font-mono text-xs min-h-[80px] ${error ? 'border-destructive' : ''}`}
          />
        </FieldWrapper>
      );
    }
  }
}, (prevProps, nextProps) => {
  // Custom comparison - ignore onChange since handlers are stable via useMemo
  return (
    prevProps.name === nextProps.name &&
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.required === nextProps.required &&
    JSON.stringify(prevProps.schema) === JSON.stringify(nextProps.schema)
  );
});
FormField.displayName = 'FormField';

export function InferOutputSchemaDialog({
  open,
  onOpenChange,
  toolId,
  toolDetails,
  toolkitSource,
  projectId,
  onSchemaUpdated,
}: InferOutputSchemaDialogProps) {
  // Connection state
  const connectionConfig = useMemo(() => createConnectionConfig(toolkitSource), [toolkitSource]);
  const hasAttemptedConnectionRef = useRef(false);
  const isUnmountingRef = useRef(false);
  const waitingForOAuthTokenRef = useRef(false);

  // Form state
  const [toolParams, setToolParams] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Inference state
  const [isInferring, setIsInferring] = useState(false);
  const [inferredSchema, setInferredSchema] = useState<Record<string, unknown> | null>(null);
  const [editedSchemaText, setEditedSchemaText] = useState<string>('');
  const [schemaParseError, setSchemaParseError] = useState<string | null>(null);
  const [toolOutput, setToolOutput] = useState<unknown>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    connect,
    disconnect,
    connectionStatus,
    mcpClient,
    oauthTriggered
  } = useConnection({
    transportType: connectionConfig?.transportType || "streamable-http",
    command: "",
    args: "",
    sseUrl: connectionConfig?.url || "",
    env: {},
    customHeaders: connectionConfig?.customHeaders,
    oauthClientId: connectionConfig?.oauthClientId,
    oauthClientSecret: connectionConfig?.oauthClientSecret,
    oauthScope: connectionConfig?.oauthScope,
    config: connectionConfig?.config || DEFAULT_INSPECTOR_CONFIG,
    connectionType: "direct",
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      hasAttemptedConnectionRef.current = false;
      isUnmountingRef.current = false;
      setIsInferring(false);
      setInferredSchema(null);
      setEditedSchemaText('');
      setSchemaParseError(null);
      setToolOutput(null);
      setInferenceError(null);
      setSaveError(null);
      setToolParams({});
      setFormErrors({});
    }
  }, [open]);

  // Initialize form defaults
  useEffect(() => {
    if (open && toolDetails?.inputSchema && Object.keys(toolParams).length === 0) {
      setToolParams(generateDefaultParams(toolDetails.inputSchema));
    }
  }, [open, toolDetails?.inputSchema]);

  // Sync schema text when inferred
  useEffect(() => {
    if (inferredSchema && !editedSchemaText) {
      setEditedSchemaText(JSON.stringify(inferredSchema, null, 2));
    }
  }, [inferredSchema]);

  // Connection management
  useEffect(() => {
    if (!open) {
      isUnmountingRef.current = true;
      if (connectionStatus !== "disconnected") {
        disconnect(false);
      }
      hasAttemptedConnectionRef.current = false;
      return;
    }

    if (open && connectionConfig?.url && connectionStatus === "disconnected") {
    hasAttemptedConnectionRef.current = false;
      isUnmountingRef.current = false;
    }
  }, [open, connectionConfig?.url, connectionStatus, disconnect]);

  useEffect(() => {
    if (
      open &&
      connectionConfig && 
      connectionStatus === "disconnected" && 
      !hasAttemptedConnectionRef.current &&
      !isUnmountingRef.current &&
      mcpClient === null
    ) {
      hasAttemptedConnectionRef.current = true;
      connect();
    }
  }, [open, connectionConfig, connect, connectionStatus, mcpClient]);

  useEffect(() => {
    if (oauthTriggered && !waitingForOAuthTokenRef.current && connectionConfig?.url) {
      waitingForOAuthTokenRef.current = true;
      const timeoutValue = connectionConfig.config.MCP_SERVER_REQUEST_TIMEOUT?.value;
      const maxWaitTime: number = typeof timeoutValue === 'number' ? timeoutValue : 30000;
      
      waitForOAuthToken(connectionConfig.url, maxWaitTime)
        .then(() => {
          waitingForOAuthTokenRef.current = false;
          setTimeout(() => {
            hasAttemptedConnectionRef.current = false;
            connect();
          }, 500);
        })
        .catch((error) => {
          waitingForOAuthTokenRef.current = false;
          hasAttemptedConnectionRef.current = false;
          console.error('[InferOutputSchemaDialog] OAuth token wait failed:', error);
        });
    }
  }, [oauthTriggered, connectionConfig, connect]);

  const callTool = useCallback(async (toolName: string, params: Record<string, unknown>) => {
    let currentClient = mcpClient;
    if (!currentClient || connectionStatus !== "connected") {
      connect();
      while (connectionStatus !== "connected") {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      currentClient = mcpClient ?? null;
      if (!currentClient) {
        throw new Error('MCP client not available after connection');
      }
    }
    if (!currentClient) {
      throw new Error('MCP client not available');
    }
    return await currentClient.callTool({ name: toolName, arguments: params });
  }, [mcpClient, connectionStatus, connect]);

  const validateForm = useCallback((): boolean => {
    if (!toolDetails?.inputSchema) return true;
    
    const inputSchema = toolDetails.inputSchema as Record<string, unknown> | undefined;
    if (!inputSchema || typeof inputSchema !== 'object' || !('properties' in inputSchema)) {
      return true;
    }
    
    const properties = inputSchema.properties as Record<string, unknown>;
    const required = (inputSchema.required as string[] | undefined) || [];
    const errors: Record<string, string> = {};
    
    for (const key of required) {
      const value = toolParams[key];
      if (value === undefined || value === null || value === '') {
        errors[key] = 'This field is required';
      } else if (typeof value === 'string') {
        const prop = properties[key];
        if (typeof prop === 'object' && prop !== null && 'type' in prop) {
          const propSchema = prop as Record<string, unknown>;
          const minLength = propSchema.minLength as number | undefined;
          const pattern = propSchema.pattern as string | undefined;
          
          if (minLength !== undefined && value.length < minLength) {
            errors[key] = `Must be at least ${minLength} character(s)`;
          }
          if (pattern && !new RegExp(pattern).test(value)) {
            errors[key] = 'Invalid format';
          }
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [toolDetails?.inputSchema, toolParams]);

  const handleParamChange = useCallback((key: string, value: unknown) => {
    setToolParams(prev => ({ ...prev, [key]: value }));
    setFormErrors(prev => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return prev;
    });
  }, []);

  const handleInferSchema = useCallback(async () => {
    if (!mcpClient || connectionStatus !== "connected" || !toolDetails || !validateForm()) {
      return;
    }

    setIsInferring(true);
    setInferenceError(null);
    setInferredSchema(null);

    try {
      const output = await callTool(toolDetails.name, toolParams);
      setToolOutput(output);

      const response = await inferToolOutputSchema(toolId, { tool_output: output }, projectId);
      if (!response?.inferred_schema) {
        throw new Error('Invalid response: inferred_schema is missing');
      }

      const schemaText = JSON.stringify(response.inferred_schema, null, 2);
      setInferredSchema(response.inferred_schema);
      setEditedSchemaText(schemaText);
      setSchemaParseError(null);
    } catch (error: any) {
      console.error('Failed to infer schema:', error);
      setInferenceError(error.message || 'Failed to infer output schema.');
    } finally {
      setIsInferring(false);
    }
  }, [mcpClient, connectionStatus, toolDetails, toolParams, toolId, projectId, validateForm, callTool]);

  const handleSchemaTextChange = useCallback((value: string) => {
    setEditedSchemaText(value);
    setSchemaParseError(validateSchemaText(value));
  }, []);

  const handleSaveSchema = useCallback(async () => {
    if (!editedSchemaText.trim()) return;

    setIsSaving(true);
    setSaveError(null);
    setSchemaParseError(null);

    try {
      const parsedSchema = JSON.parse(editedSchemaText);
      
      if (typeof parsedSchema !== 'object' || parsedSchema === null || Array.isArray(parsedSchema)) {
        setSchemaParseError('Schema must be a valid JSON object');
        setIsSaving(false);
        return;
      }

      await updateTool(toolId, { outputSchema: parsedSchema }, projectId);
      onSchemaUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save schema:', error);
      if (error instanceof SyntaxError) {
        setSchemaParseError('Invalid JSON format. Please check your syntax.');
      } else {
        setSaveError(error.message || 'Failed to save schema');
      }
    } finally {
      setIsSaving(false);
    }
  }, [editedSchemaText, toolId, projectId, onSchemaUpdated, onOpenChange]);

  // Connection status
  const isConnectionReady = connectionStatus === "connected" && mcpClient !== null;
  const isConnecting = connectionConfig && open && (
    connectionStatus === "disconnected" || 
    (hasAttemptedConnectionRef.current && connectionStatus !== "connected" && 
     connectionStatus !== "error" && connectionStatus !== "error-connecting-to-proxy")
  );
  const hasConnectionError = connectionStatus === "error" || connectionStatus === "error-connecting-to-proxy";

  // Get input schema properties
  const inputSchema = toolDetails.inputSchema as Record<string, unknown> | undefined;
  const hasInputParams = inputSchema && typeof inputSchema === 'object' && 'properties' in inputSchema;
  const properties = hasInputParams ? (inputSchema.properties as Record<string, unknown>) : {};
  const required = (inputSchema?.required as string[] | undefined) || [];

    return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Infer Output Schema
          </DialogTitle>
          <DialogDescription>
            Connect to the MCP server and call the tool to automatically infer its output schema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-y-auto overflow-x-hidden">
          {!connectionConfig && <LoadingState message="Loading configuration..." />}
          {isConnecting && connectionConfig && <LoadingState message="Connecting to MCP server..." />}

          {hasConnectionError && connectionConfig && (
            <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Failed to connect to MCP server</span>
                <Button variant="outline" size="sm" onClick={() => {
                hasAttemptedConnectionRef.current = false;
                connect();
                }}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
          )}

          {isConnectionReady && !inferredSchema && !isInferring && !inferenceError && (
            <div className="space-y-4">
              {hasInputParams ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Tool Parameters</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Provide values for the tool parameters below. Required fields are marked with *.
                      </p>
      </div>
                    {Object.entries(properties).map(([key, prop]) => (
                      <FormField
                        key={key}
                        name={key}
                        schema={prop as Record<string, unknown>}
                        value={toolParams[key]}
                        error={formErrors[key]}
                        required={required.includes(key)}
                        onChange={(value) => handleParamChange(key, value)}
                      />
                    ))}
        </div>
                  <Button
                    onClick={handleInferSchema}
                    disabled={isInferring || Object.keys(formErrors).length > 0}
                    className="w-full"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Call Tool & Infer Schema
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connected to MCP server. This tool has no input parameters. Click the button below to call the tool and infer its output schema.
                  </p>
                  <Button onClick={handleInferSchema} disabled={isInferring} className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Call Tool & Infer Schema
                  </Button>
                </>
              )}
      </div>
          )}

          {isInferring && <LoadingState message="Calling tool and inferring schema..." />}

          {inferenceError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{inferenceError}</AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          {inferredSchema && (
            <div className="space-y-4">
              <JsonEditor
                id="schema-editor"
                value={editedSchemaText}
                onChange={handleSchemaTextChange}
                label="Output Schema (Editable)"
                placeholder="Enter JSON schema..."
                error={schemaParseError}
                minHeight="300px"
                maxHeight="400px"
              />
              {toolOutput !== null && toolOutput !== undefined && (
                <JsonViewer
                  data={toolOutput}
                  label="Tool Output (used for inference)"
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {inferredSchema && (
            <Button 
              onClick={handleSaveSchema} 
              disabled={isSaving || !!schemaParseError || !editedSchemaText.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Output Schema'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
