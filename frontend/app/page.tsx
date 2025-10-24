'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { ArrowRight, CheckCircle, Clock, Brain, Calendar, Zap, Shield, Users, Star, ChevronRight, Play } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!loading && user) {
      setIsRedirecting(true)
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
  }, [user, loading, router])

  useEffect(() => {
    // Simple GSAP animations without complex plugins
    if (typeof window !== 'undefined' && containerRef.current) {
      import('gsap').then(({ gsap }) => {
        // Set initial states
        gsap.set('.animate-fade-in', { opacity: 0, y: 30 })
        gsap.set('.animate-slide-up', { opacity: 0, y: 50 })
        gsap.set('.animate-slide-left', { opacity: 0, x: -50 })
        gsap.set('.animate-slide-right', { opacity: 0, x: 50 })

        // Animate elements on load
        gsap.to('.animate-fade-in', {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.1
        })

        gsap.to('.animate-slide-up', {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: 'power3.out',
          stagger: 0.15,
          delay: 0.3
        })

        // Hero text reveal animation
        gsap.fromTo('.hero-text',
          { clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)', opacity: 0 },
          { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)', opacity: 1, duration: 1.5, ease: 'power3.inOut' }
        )

        gsap.fromTo('.hero-subtext',
          { clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)', opacity: 0 },
          { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)', opacity: 1, duration: 1.5, ease: 'power3.inOut', delay: 0.3 }
        )

        // Button animations
        gsap.fromTo('.hero-buttons',
          { opacity: 0, y: 30, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'back.out(1.7)', delay: 0.6 }
        )

        // Image animation
        gsap.fromTo('.hero-image',
          { opacity: 0, x: 100, rotation: 5 },
          { opacity: 1, x: 0, rotation: 0, duration: 1.5, ease: 'power3.out', delay: 0.4 }
        )

        // Navigation animation
        gsap.fromTo('nav',
          { y: -100, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
        )

        // Stagger nav items
        gsap.fromTo('.nav-item',
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.3 }
        )

        // Floating elements
        gsap.to('.floating', {
          y: -10,
          x:-70,
          duration: 2,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.5
        })
      })
    }
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-white text-black">
      {/* Clean Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-glass z-[999]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold">REMO.ai</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/auth" className="btn-primary nav-item">
            Get Started
          </Link>
          </div>
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-black transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Award-Winning Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden bg-white">
        {/* Geometric Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-black/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gray-900/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-gray-200/30 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-gray-300/20 rounded-full"></div>
        </div>

        <div className="relative max-w-7xl mx-auto ">
          {/* Centered Hero Content */}
          <div className="text-center space-y-12">
            {/* Award Badge */}
            {/* Main Headlines */}
            <div className="space-y-8 ">
              <h1 className="hero-text text-7xl lg:text-8xl xl:text-9xl font-black leading-[0.85] tracking-tight">
                <span className="block text-black relative">
                  THINK
                  <div className="absolute -right-16 top-8 w-12 h-12 bg-black rounded-full flex items-center justify-center transform rotate-12">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </span>
                <span className="block text-gray-400 italic font-light">smarter</span>
                <span className="block text-black relative">
                  WORK
                  <div className="absolute -left-16 top-4 w-16 h-2 bg-black rounded-full"></div>
                </span>
                <span className="block text-black">FASTER</span>
              </h1>
              
              <p className="hero-subtext text-2xl lg:text-3xl text-gray-600 leading-relaxed max-w-4xl mx-auto font-light">
                The world's first <span className="font-semibold text-black">AI-native workspace</span> that adapts to your mind, 
                <br />amplifies your potential, and transforms how you create.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="hero-buttons flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/auth" className="group relative overflow-hidden bg-black text-white px-12 py-6 rounded-2xl text-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                <span className="relative z-10 flex items-center gap-3">
                  Start Your Journey
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              
              <button className="group flex items-center gap-4 text-xl font-semibold text-black hover:text-gray-800 transition-colors">
                <div className="w-16 h-16 bg-white border-2 border-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Play className="w-6 h-6 ml-1" fill="currentColor" />
                </div>
                Watch Experience
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto">
              <div className="text-center group">
                <div className="text-5xl font-black text-black group-hover:scale-110 transition-transform">50K+</div>
                <div className="text-gray-600 font-medium">Creative Professionals</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-black text-black group-hover:scale-110 transition-transform">99.9%</div>
                <div className="text-gray-600 font-medium">Uptime SLA</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-black text-black group-hover:scale-110 transition-transform">4.9★</div>
                <div className="text-gray-600 font-medium">User Rating</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl font-black text-black group-hover:scale-110 transition-transform">24/7</div>
                <div className="text-gray-600 font-medium">AI Assistant</div>
              </div>
            </div>
          </div>

          {/* Floating Interface Elements */}
          <div className="absolute top-1/4 left-8 lg:left-20 floating">
            <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-200 max-w-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-black">AI Insights</h4>
                  <p className="text-gray-600">Real-time analysis</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-gray-800">Focus time: 94%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-gray-800">Productivity: +23%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="font-medium text-gray-800">Flow state: Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-1/3 right-8 lg:right-20 floating" style={{ animationDelay: '2s' }}>
            <div className="bg-black text-white rounded-3xl p-8 shadow-2xl max-w-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-xl">Smart Automation</h4>
                  <p className="text-gray-300">Tasks completed</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3">
                  <span className="font-medium">Email sorting</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3">
                  <span className="font-medium">Calendar sync</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3">
                  <span className="font-medium">Task prioritization</span>
                  <Clock className="w-5 h-5 text-yellow-400 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 floating" style={{ animationDelay: '4s' }}>
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h5 className="font-bold text-black">Team Sync</h5>
                  <p className="text-sm text-gray-600">5 members active</p>
                </div>
              </div>
              <div className="flex -space-x-3">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">C</div>
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold">+2</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Revolutionary Features Section */}
      <section id="features" className="relative py-40 px-6 bg-black text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl bg-morph"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl bg-morph" style={{ animationDelay: '10s' }}></div>
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 gap-4 h-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border border-white/10"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-flex items-center gap-3 bg-white text-black px-6 py-3 rounded-full text-sm font-semibold mb-8">
              <Zap className="w-4 h-4" />
              Revolutionary Technology
            </div>
            <h2 className="text-6xl lg:text-7xl font-black mb-8 leading-tight">
              <span className="block">FEATURES THAT</span>
              <span className="block text-gray-400 italic font-light">redefine</span>
              <span className="block">PRODUCTIVITY</span>
            </h2>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-light">
              Experience the future of work with AI-powered features that adapt to your mind, 
              amplify your creativity, and transform your potential into results.
            </p>
          </div>
          
          {/* Premium Feature Cards */}
          <div className="grid lg:grid-cols-3 gap-12 mb-32">
            <div className="group relative">
              <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 group-hover:border-white/30 transition-all duration-500"></div>
              <div className="relative p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Brain className="w-12 h-12 text-black" />
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white group-hover:text-gray-200 transition-colors">Neural Intelligence</h3>
                <p className="text-xl text-gray-300 leading-relaxed mb-8 group-hover:text-gray-200 transition-colors">
                  Advanced AI that learns your patterns, anticipates your needs, and evolves with your workflow for unprecedented productivity.
                </p>
                <div className="flex items-center justify-center text-white font-semibold group-hover:translate-x-2 transition-transform duration-300 text-lg">
                  Explore Neural AI <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 group-hover:border-white/30 transition-all duration-500"></div>
              <div className="relative p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Calendar className="w-12 h-12 text-black" />
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white group-hover:text-gray-200 transition-colors">Quantum Scheduling</h3>
                <p className="text-xl text-gray-300 leading-relaxed mb-8 group-hover:text-gray-200 transition-colors">
                  Multi-dimensional calendar optimization that considers energy levels, focus patterns, and peak performance windows.
                </p>
                <div className="flex items-center justify-center text-white font-semibold group-hover:translate-x-2 transition-transform duration-300 text-lg">
                  Master Time <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10 group-hover:border-white/30 transition-all duration-500"></div>
              <div className="relative p-12 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Zap className="w-12 h-12 text-black" />
                </div>
                <h3 className="text-3xl font-bold mb-6 text-white group-hover:text-gray-200 transition-colors">Flow Amplification</h3>
                <p className="text-xl text-gray-300 leading-relaxed mb-8 group-hover:text-gray-200 transition-colors">
                  Real-time flow state detection and enhancement with biometric feedback and environmental optimization.
                </p>
                <div className="flex items-center justify-center text-white font-semibold group-hover:translate-x-2 transition-transform duration-300 text-lg">
                  Enter Flow <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Capabilities Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h4 className="font-bold text-white text-xl mb-3">Quantum Security</h4>
              <p className="text-gray-300 leading-relaxed">Military-grade encryption with blockchain verification</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h4 className="font-bold text-white text-xl mb-3">Collective Intelligence</h4>
              <p className="text-gray-300 leading-relaxed">AI-enhanced team synchronization and shared cognition</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h4 className="font-bold text-white text-xl mb-3">Temporal Analytics</h4>
              <p className="text-gray-300 leading-relaxed">Predictive time modeling with outcome forecasting</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 border border-white/20">
                <Star className="w-10 h-10 text-white" />
              </div>
              <h4 className="font-bold text-white text-xl mb-3">Achievement Engine</h4>
              <p className="text-gray-300 leading-relaxed">Goal materialization through micro-optimization</p>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-32 px-6 bg-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-6xl font-bold mb-8 text-black">
            Ready to Transform Your Productivity?
          </h2>
          <p className="text-xl lg:text-2xl mb-12 text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Join over 4 professionals who have revolutionized their workflow with REMO.ai's AI-powered task management.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link href="/auth" className="btn-primary text-lg px-10 py-5 rounded-lg flex items-center gap-3 group">
              Begin The Journey
          </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-black" />
                </div>
                <span className="text-3xl font-bold">REMO.ai</span>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
                The future of productivity is here. Transform your workflow with AI-powered task management and intelligent automation.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Product</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Resources</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">Company</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Press</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} REMO.ai. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
