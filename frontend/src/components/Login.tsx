import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle, Settings } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{username?: string; password?: string}>({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
  });

  // Check setup status on component mount
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/setup/status');
        const data = await response.json();
        setSetupRequired(data.setupRequired);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setSetupRequired(false);
      }
    };
    
    checkSetupStatus();
  }, []);

  const validateForm = () => {
    const newErrors: {username?: string; password?: string} = {};
    
    if (!credentials.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSetupForm = () => {
    return setupForm.username.trim() && 
           setupForm.password.length >= 6 && 
           setupForm.email.trim() && 
           setupForm.fullName.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await login(credentials);
    if (!success) {
      setLoginAttempts(prev => prev + 1);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSetupForm()) {
      return;
    }

    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupForm),
      });

      const data = await response.json();
      
      if (data.success) {
        // Setup successful, hide setup form and show login
        setSetupRequired(false);
        setShowSetup(false);
        setCredentials({
          username: setupForm.username,
          password: setupForm.password,
        });
        // Clear setup form
        setSetupForm({
          username: '',
          password: '',
          email: '',
          fullName: '',
        });
        
        // Show success message
        console.log('Admin user created successfully! You can now login.');
      } else {
        console.error('Setup failed:', data.message);
      }
    } catch (error) {
      console.error('Setup error:', error);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSetupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSetupForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fillDemoCredentials = (type: 'admin' | 'staff') => {
    const demoCredentials = {
      admin: { username: 'admin', password: 'secret' },
      staff: { username: 'staff', password: 'secret' }
    };
    
    setCredentials(demoCredentials[type]);
    setErrors({});
  };

  // Show loading state while checking setup status
  if (setupRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show setup form if setup is required
  if (setupRequired && showSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl shadow-lg flex items-center justify-center">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Initial Setup
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Create your first admin user to get started
            </p>
          </div>
          
          <div className="bg-white shadow-xl rounded-lg p-8">
            <form className="space-y-6" onSubmit={handleSetupSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="setup-username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="setup-username"
                    name="username"
                    type="text"
                    required
                    className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter admin username"
                    value={setupForm.username}
                    onChange={handleSetupChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="setup-email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter admin email"
                    value={setupForm.email}
                    onChange={handleSetupChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="setup-fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="setup-fullName"
                    name="fullName"
                    type="text"
                    required
                    className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter full name"
                    value={setupForm.fullName}
                    onChange={handleSetupChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="setup-password"
                    name="password"
                    type="password"
                    required
                    className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter password (min 6 characters)"
                    value={setupForm.password}
                    onChange={handleSetupChange}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!validateSetupForm()}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Admin User
                </button>
              </div>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl shadow-lg flex items-center justify-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to TruePal Inventory
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your inventory management system
          </p>
          
          {loginAttempts > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <p className="text-sm text-yellow-700">
                  {loginAttempts === 1 
                    ? "Login failed. Please check your credentials and try again." 
                    : `${loginAttempts} failed login attempts. Please verify your username and password.`
                  }
                </p>
              </div>
            </div>
          )}

          {setupRequired && (
            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-md">
              <div className="flex items-start">
                <Settings className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Initial Setup Required</p>
                  <p className="text-sm text-blue-600 mt-1">
                    No users found in the system. You need to create the first admin user.
                  </p>
                  <button
                    onClick={() => setShowSetup(true)}
                    className="mt-2 text-sm text-blue-800 hover:text-blue-900 underline"
                  >
                    Click here to set up your admin account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white shadow-xl rounded-lg p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.username}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`appearance-none rounded-md relative block w-full px-3 py-2 pr-10 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || Object.keys(errors).length > 0}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
{/* 
          {!setupRequired && (
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-600">
                <p className="text-blue-600">
                  After creating your admin account, you can create additional staff users through the admin panel.
                </p>
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default Login;