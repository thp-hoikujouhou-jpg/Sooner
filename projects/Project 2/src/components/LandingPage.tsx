import React from 'react';
import { ArrowRight, Zap, Shield, Smartphone } from 'lucide-react';

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group cursor-default">
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
          Aether
        </div>
        <div className="hidden md:flex space-x-8 text-slate-600 font-medium">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
          <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
        </div>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-slate-800 transition-all shadow-md hover:shadow-lg">
          Get Started
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center flex flex-col items-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-8 border border-blue-100">
          ✨ Introducing the new design system
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Build faster with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
            React & Tailwind
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create stunning, responsive web applications in record time. Our highly customizable components help you deliver beautiful user experiences.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <button className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all w-full sm:w-auto">
            <span>Start Building</span>
            <ArrowRight size={20} />
          </button>
          <button className="bg-white text-slate-700 px-8 py-4 rounded-full font-semibold text-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm w-full sm:w-auto">
            View Documentation
          </button>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose our platform?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Everything you need to build modern applications, packed into a single, cohesive ecosystem.
            </p>
          </div>
          
          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="text-blue-600" size={28} />}
              title="Lightning Fast"
              description="Optimized for speed. Your applications will load instantly and perform smoothly under heavy loads."
            />
            <FeatureCard 
              icon={<Shield className="text-blue-600" size={28} />}
              title="Secure by Default"
              description="Enterprise-grade security built directly into the core, keeping your users' data safe and sound."
            />
            <FeatureCard 
              icon={<Smartphone className="text-blue-600" size={28} />}
              title="Fully Responsive"
              description="Looks perfect on any device. Components automatically adapt to screen sizes from mobile to desktop."
            />
          </div>
        </div>
      </section>
    </div>
  );
}