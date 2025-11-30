import React, { useState, useRef } from 'react';
import { Sparkles, Zap, Code, Layers, Play, Pause, Mail, Calendar, Github, Star, User, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeroPageProps {
  isUserSignedIn: boolean;
}

const HeroPage = ({ isUserSignedIn }: HeroPageProps) => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  return (
    <div className="overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-7 w-7 image-shadow rounded-lg" />
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <ThemeToggle />
          <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          <a
            href="https://discord.gg/RaH6jBzA"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            aria-label="Discord"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"></path>
            </svg>
          </a>
          <a
            href="https://github.com/pixie-org/pixie"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.305.762-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.49 11.49 0 0 1 6 0c2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
            </svg>
          </a>
          <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          <a
            href="https://x.com/trypixieapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            aria-label="X (Twitter)"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
          </a>
          <span className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></span>
          {isUserSignedIn ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/projects")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <User className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>
      {/* Hero Section */}
      <div className="relative min-h-[80vh] flex items-center justify-center px-4 bg-white dark:bg-gray-900 pb-2">
        {/* Animated background elements - Purple and Teal gradients */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-purple-400 dark:bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 top-20 -left-40"></div>
          <div className="absolute w-[600px] h-[600px] bg-teal-400 dark:bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 bottom-20 -right-40"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/80 dark:bg-white/10 backdrop-blur-lg rounded-full mb-8 border border-gray-200 dark:border-white/20">
            <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-white">Engage with billions more on chat platforms</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
            Get {' '}
            <span style={{ background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(20, 184, 166))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Agentic Apps
            </span> for your product
            <br />
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Build rich, on-brand apps that run in ChatGPT, Claude, and more.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-row flex-wrap gap-4 justify-center items-center">
            <a
              href="https://github.com/pixie-org/pixie"
              target="_blank"
              rel="noopener noreferrer"
              className="group px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <span className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                
              </span>
              <span className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                Star us
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Showcase Section */}
      <div className="pb-20 px-4 relative bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              See It In Action
            </h2>
          </div>

          {/* Demo Video */}
          <div className="relative max-w-7xl mx-auto mb-12">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 p-2 relative group">
              <video
                ref={videoRef}
                className="w-full h-auto rounded-lg"
                preload="metadata"
                playsInline
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              >
                <source src="https://ndeoluaeglcmlantlatc.supabase.co/storage/v1/object/public/public_demo/pixie_demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isVideoPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                  }
                }}
                className={`absolute inset-0 flex items-center justify-center transition-all rounded-lg ${
                  isVideoPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                } bg-black/20 hover:bg-black/30`}
                aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
              >
                <div className="w-20 h-20 rounded-full bg-white/90 dark:bg-gray-800/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  {isVideoPlaying ? (
                    <Pause className="w-10 h-10 text-gray-900 dark:text-white ml-1" fill="currentColor" />
                  ) : (
                    <Play className="w-10 h-10 text-gray-900 dark:text-white ml-1" fill="currentColor" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Multi-Platform</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create once, run everywhere.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-pink-500/50 dark:hover:border-pink-500/50 transition-all">
            <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Fully Branded</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Make every interaction branded.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all">
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Lightning Fast Setup</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create in hours, not months.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
              <Code className="w-6 h-6 text-teal-600 dark:text-teal-600" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No Code Required</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Describe in natural language.
            </p>
          </div>

        </div>
      </div>

      {/* Contact Us Section */}
      <div className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Contact Us
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get in touch with our team
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a
              href="mailto:guru@trypixie.app"
              className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                  <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Email Us</h3>
                  <p className="text-gray-600 dark:text-gray-400">guru@trypixie.app</p>
                </div>
              </div>
            </a>
            <a
              href="https://calendly.com/guru-trypixie/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-50 dark:bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-gray-200 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                  <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">Schedule a Call</h3>
                  <p className="text-gray-600 dark:text-gray-400">Book a 30-minute meeting</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

     
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .carousel-smooth {
          scroll-behavior: smooth;
        }
        .carousel-smooth > div {
          transition: transform 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default HeroPage;