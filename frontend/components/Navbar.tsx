'use client'

import React, { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'
import { Menu, X, User, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

gsap.registerPlugin(ScrollTrigger)

const Navbar = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  const navRef = useRef<HTMLDivElement>(null)
  const listRefs = useRef<HTMLLIElement[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useGSAP(() => {
    // Navbar hide/show on scroll
    ScrollTrigger.create({
      start: 'top top',
      end: 'max',
      onUpdate: (self) => {
        const direction = self.direction
        gsap.to(navRef.current, {
          y: direction === 1 ? -100 : 0,
          duration: 0.6,
          ease: 'power2.out',
        })
      },
    })

    gsap.from(listRefs.current, {
      y: -30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.3,
    })
  }, [])

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Calendar', href: '/calendar' },
    { name: 'Profile', href: '/profile' },
  ]

  return (
    <div
      ref={navRef}
      className="fixed top-0 left-0 right-0 h-16 w-full bg-white z-50 border-b border-gray-200"
    >
      <div className="flex h-full justify-between items-center px-4 md:px-8 lg:px-12">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-bold tracking-tight">REMO.ai</Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <ul className="text-black flex items-center space-x-8">
            {navLinks.map((link, i) => (
              <li
                key={i}
                ref={(el) => {
                  if (el) listRefs.current[i] = el
                }}
              >
                <Link
                  href={link.href}
                  className="relative group transition-all duration-300 text-gray-700 hover:text-black"
                >
                  {link.name}
                  <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
            ))}
            
            {user ? (
              <div className="relative ml-4">
                <button 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <User size={18} />
                </button>
                
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Your Profile
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Dashboard
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/auth" 
                className="ml-4 px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Sign in
              </Link>
            )}
          </ul>
        </div>

        {/* Mobile Navigation Button */}
        <div className="md:hidden flex items-center">
          {user && (
            <button 
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="mr-4 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <User size={18} />
            </button>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-700 hover:text-black"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="block py-2 text-base text-gray-700 hover:text-black"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {!user && (
              <Link 
                href="/auth" 
                className="block py-2 text-base text-gray-700 hover:text-black"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            )}
            {user && (
              <button 
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="block py-2 text-base text-gray-700 hover:text-black w-full text-left"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Profile Menu */}
      {profileMenuOpen && (
        <div className="md:hidden absolute right-4 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <Link 
            href="/profile" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setProfileMenuOpen(false)}
          >
            Your Profile
          </Link>
          <Link 
            href="/dashboard" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setProfileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <button 
            onClick={() => {
              handleLogout();
              setProfileMenuOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default Navbar
