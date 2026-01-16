
import React from 'react';
import { Infinity, ShieldCheck, TruckIcon } from 'lucide-react';
import { MOCK_USERS } from '../mockData';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="text-white space-y-6">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <Infinity className="w-10 h-10 text-blue-900" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">WebXpress</h1>
          </div>
          <p className="text-xl text-blue-100 font-light leading-relaxed">
            The next generation reverse-bidding logistics ecosystem. Optimize lanes, reduce costs, and streamline your supply chain.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <h3 className="font-bold text-lg">500+</h3>
              <p className="text-blue-200 text-sm">Verified Vendors</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <h3 className="font-bold text-lg">15k+</h3>
              <p className="text-blue-200 text-sm">Monthly Shipments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-slate-500">Select your role to continue</p>
          </div>

          <div className="space-y-4">
            {/* Admin Option */}
            <div className="border-b pb-4 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Internal</p>
              {MOCK_USERS.filter(u => u.role === UserRole.ADMIN).map(user => (
                <button
                  key={user.id}
                  onClick={() => onLogin(user)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <ShieldCheck className="w-6 h-6 text-blue-700" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">Fleet Administrator</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-white"></div>
                  </div>
                </button>
              ))}
            </div>

            {/* Vendor Options */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transport Partners</p>
              <div className="space-y-3">
                {MOCK_USERS.filter(u => u.role === UserRole.VENDOR).map(user => (
                  <button
                    key={user.id}
                    onClick={() => onLogin(user)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <TruckIcon className="w-6 h-6 text-indigo-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.lanes?.length} Registered Lanes</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-white"></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-center text-xs text-slate-400">
            Secure multi-factor authentication enabled for all enterprise accounts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
