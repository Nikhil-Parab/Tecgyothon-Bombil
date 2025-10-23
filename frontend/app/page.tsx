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
      <nav className="fixed top-0 left-0 right-0 z-50 nav-glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold">Bombil</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="nav-item text-gray-700 hover:text-black transition-colors font-medium">Features</Link>
            <Link href="#testimonials" className="nav-item text-gray-700 hover:text-black transition-colors font-medium">Testimonials</Link>
            <Link href="#pricing" className="nav-item text-gray-700 hover:text-black transition-colors font-medium">Pricing</Link>
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

      {/* Hero Section */}
      <section className="hero-bg relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="hero-text text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-black">Boost Your</span><br />
                <span className="text-gray-600">Productivity</span><br />
                <span className="text-black">with AI</span>
              </h1>
              <p className="hero-subtext text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-2xl">
                Bombil revolutionizes task management with intelligent automation, 
                contextual suggestions, and seamless workflow optimization.
              </p>
            </div>
            
            <div className="hero-buttons flex flex-col sm:flex-row gap-4">
              <Link href="/auth" className="btn-primary text-lg px-8 py-4 rounded-lg flex items-center justify-center gap-3 group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="btn-secondary text-lg px-8 py-4 rounded-lg flex items-center justify-center gap-3 group">
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-black">10K+</div>
                <div className="text-gray-600">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">4.9★</div>
                <div className="text-gray-600">Rating</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hero-image relative">
            <div className="relative z-10">
              {/* Main Dashboard Card */}
              <div className="card bg-black text-white p-8 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Smart Dashboard</h3>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                    <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-medium">Complete project proposal</span>
                    <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-400" />
                    <span className="text-white font-medium">Review team metrics</span>
                    <div className="ml-auto w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    <span className="text-white font-medium">Schedule client meeting</span>
                    <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 floating">
                <div className="card p-6 rounded-2xl shadow-xl bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
          <div>
                      <div className="font-bold text-black">AI Insights</div>
                      <div className="text-sm text-gray-600">3 suggestions</div>
                    </div>
                  </div>
            </div>
          </div>

              <div className="absolute -bottom-4 -left-4 floating">
                <div className="card p-6 rounded-2xl shadow-xl bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-black">Flow State</div>
                      <div className="text-sm text-gray-600">Optimal</div>
                </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 text-black">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Everything you need to transform your productivity and achieve your goals with intelligent automation.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            <div className="card group hover:scale-105 transition-all duration-500">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-black">AI-Powered Insights</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Get intelligent suggestions based on your work patterns, priorities, and productivity data to optimize your workflow.
              </p>
              <div className="flex items-center text-black font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div className="card group hover:scale-105 transition-all duration-500">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-black">Smart Scheduling</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Seamlessly integrate with your calendar and automatically optimize your schedule for maximum productivity.
              </p>
              <div className="flex items-center text-black font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div className="card group hover:scale-105 transition-all duration-500">
              <div className="w-16 h-16 bg-gray-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-black">Flow State Optimization</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Monitor and enhance your focus with real-time flow state tracking and personalized productivity recommendations.
              </p>
              <div className="flex items-center text-black font-semibold group-hover:translate-x-2 transition-transform duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card text-center group">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-black mb-2">Secure & Private</h4>
              <p className="text-sm text-gray-600">Enterprise-grade security</p>
            </div>

            <div className="card text-center group">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-black mb-2">Team Collaboration</h4>
              <p className="text-sm text-gray-600">Seamless team workflows</p>
            </div>

            <div className="card text-center group">
              <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-black mb-2">Time Tracking</h4>
              <p className="text-sm text-gray-600">Detailed analytics</p>
            </div>

            <div className="card text-center group">
              <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="w-6 h-6 text-white" />
            </div>
              <h4 className="font-bold text-black mb-2">Smart Goals</h4>
              <p className="text-sm text-gray-600">Achieve more, faster</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 px-6 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6 text-white">
              Loved by Professionals
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Join thousands of professionals who have transformed their productivity with Bombil.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="card bg-gray-900 text-white group">
              <div className="flex items-center mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-lg mb-6 leading-relaxed">
                "Bombil has completely revolutionized how I manage my daily tasks. The AI-powered suggestions are incredibly accurate and have saved me hours every week."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-lg">SJ</span>
                </div>
                <div>
                  <p className="font-bold text-white">Sarah Johnson</p>
                  <p className="text-gray-300">Product Manager at TechCorp</p>
                </div>
              </div>
            </div>

            <div className="card bg-gray-900 text-white group">
              <div className="flex items-center mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-lg mb-6 leading-relaxed">
                "The flow state tracking feature is a game-changer. I've identified my most productive hours and optimized my entire schedule around them."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-lg">MC</span>
                </div>
                <div>
                  <p className="font-bold text-white">Michael Chen</p>
                  <p className="text-gray-300">Senior Software Developer</p>
                </div>
              </div>
            </div>

            <div className="card bg-gray-900 text-white group">
              <div className="flex items-center mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-lg mb-6 leading-relaxed">
                "As a startup founder, time is everything. Bombil's smart scheduling and team collaboration features have been invaluable for our growth."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-lg">AR</span>
                </div>
                <div>
                  <p className="font-bold text-white">Alex Rodriguez</p>
                  <p className="text-gray-300">Founder & CEO, InnovateLab</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-gray-300 mb-8">Trusted by teams at</p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
              <div className="text-2xl font-bold text-white">Microsoft</div>
              <div className="text-2xl font-bold text-white">Google</div>
              <div className="text-2xl font-bold text-white">Amazon</div>
              <div className="text-2xl font-bold text-white">Netflix</div>
              <div className="text-2xl font-bold text-white">Spotify</div>
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
            Join over 10,000 professionals who have revolutionized their workflow with Bombil's AI-powered task management.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link href="/auth" className="btn-primary text-lg px-10 py-5 rounded-lg flex items-center gap-3 group">
              Start Free Trial
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
            <button className="btn-secondary text-lg px-10 py-5 rounded-lg flex items-center gap-3 group">
              <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Watch Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-black" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-black" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-black" />
              <span>Cancel anytime</span>
            </div>
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
                <span className="text-3xl font-bold">Bombil</span>
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
              &copy; {new Date().getFullYear()} Bombil. All rights reserved.
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
