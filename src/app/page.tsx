'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';

const SAMPLE_IMAGES = [
  "https://img.freepik.com/free-vector/cloud-services-isometric-composition-with-small-figures-people-with-computer-screens_1284-30497.jpg?t=st=1767964951~exp=1767968551~hmac=a838f4281bc60e4ece2d61e9552f22de1637384ea5eb3c2d0cd1886d369671af",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678"
];

const getRandomImage = (id: string) => {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SAMPLE_IMAGES[sum % SAMPLE_IMAGES.length];
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const now = Date.now();
        const eventsRef = collection(db, 'events');
        // For featured, let's get Global scope upcoming events
        // In real app, we might have a 'featured' flag or custom algorithm
        const q = query(
          eventsRef
        );

        const snap = await getDocs(q);
        let events = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];

        // Filter upcoming and Sort
        events = events.filter(e => e.startTime > now);
        events.sort((a, b) => a.startTime - b.startTime);

        // Take top 3
        setFeaturedEvents(events.slice(0, 3));
      } catch (e) {
        console.warn("Failed to fetch featured events", e);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  const handleEventClick = () => {
    if (!user) {
      router.push('/login');
    } else {
      router.push('/dashboard/student'); // Or redirect to specific event if public view exists
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        {/* Glow Effect */}
        <div className="hero-bg-glow" />

        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <div style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span>
              <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Live at 12+ Campuses</span>
            </div>

            <h1 className="headline">
              The Operating System for <br />
              <span style={{ background: 'linear-gradient(to right, #3b82f6, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Colleges & Clubs
              </span>
            </h1>

            <p className="subheadline">
              Manage registrations, verify attendance, and govern student activities with
              real legitimacy. No more Google Forms.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!user ? (
                <Link href="/signup" className="btn btn-primary" style={{ minWidth: '160px' }}>
                  Get Started
                </Link>
              ) : (
                <Link href="/dashboard" className="btn btn-primary" style={{ minWidth: '160px' }}>
                  Go to Dashboard
                </Link>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="container padding-y">
        <div className="flex justifyContent-between items-center" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '2rem' }}>Featured Events</h2>
          <button onClick={handleEventClick} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>Loading events...</div>
        ) : featuredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
            <p style={{ opacity: 0.6 }}>No upcoming events right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {featuredEvents.map(event => {
              const imageSrc = event.posterURL || getRandomImage(event.id);
              const date = new Date(event.startTime);

              return (
                <div key={event.id} onClick={handleEventClick} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, background 0.2s',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <div style={{ height: '160px', position: 'relative' }}>
                    <img
                      src={imageSrc}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.target as HTMLImageElement).src = SAMPLE_IMAGES[0]; }}
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    {event.status === 'ENDED' && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', fontSize: '0.8rem' }}>
                        ENDED
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      {event.collegeId === 'Global_College' ? 'CMRIT' : event.collegeId}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: '700', lineHeight: '1.4' }}>{event.title}</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }}>
                      {event.description}
                    </p>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5, fontSize: '0.75rem' }}>
                      <span>📍 {event.venue}</span>
                      <span>↗</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
