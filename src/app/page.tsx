'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { 
    Calendar, Users, Medal, Zap, ShieldCheck, 
    ArrowRight, MessageSquare, Ticket,
    CheckCircle, Award, Star, Search
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';

// Theme Colors - Using native CSS variables for Dark/Light mode support
const C = {
    primary: '#6C4CF1',
    secondary: '#A855F7',
    accent: '#22C55E',
};

export default function LandingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { scrollYProgress } = useScroll();
    
    // Parallax values
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    // Data State
    const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
    
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const q = query(collection(db, 'events'));
                const snap = await getDocs(q);
                let events = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
                events = events.filter(e => e.scope === 'GLOBAL').sort((a, b) => b.startTime - a.startTime).slice(0, 3);
                setFeaturedEvents(events);
            } catch (e) {
                console.error(e);
            }
        };
        fetchEvents();
    }, []);

    // Helper Animation Variants
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
    };

    return (
        <div style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)', minHeight: '100vh', overflowX: 'hidden', fontFamily: 'var(--font-inter)' }}>
            
            <div style={{ position: 'relative', zIndex: 50 }}>
                <Navbar />
            </div>

            {/* SECTION 1: HERO */}
            <section className="landing-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                
                {/* Background Glows */}
                <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(108, 76, 241, 0.15) 0%, rgba(0, 0, 0, 0) 70%)', zIndex: 0 }} />
                
                <motion.div style={{ y: yHero, opacity: opacityHero, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '800px', padding: '0 24px' }}>
                    
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ padding: '8px 16px', background: 'rgba(108, 76, 241, 0.1)', color: C.primary, borderRadius: '30px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid rgba(108, 76, 241, 0.2)` }}>
                        <Zap size={14} /> The Next-Gen Campus Platform
                    </motion.div>

                    <motion.h1 className="landing-h1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} style={{ fontSize: '4.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1px' }}>
                        Where Campus Life <br/>
                        <span style={{ background: `linear-gradient(to right, ${C.primary}, ${C.secondary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Comes Alive.</span>
                    </motion.h1>

                    <motion.p className="landing-p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '40px', maxWidth: '600px' }}>
                        Discover events, connect with clubs, earn certificates, build your portfolio, and unlock opportunities through one intelligent platform.
                    </motion.p>

                    <motion.div className="landing-buttons" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link href={!user ? "/signup" : "/dashboard/student"} style={{ textDecoration: 'none', width: 'auto' }} className="mobile-full-width">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '16px 32px', background: C.primary, color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 10px 25px rgba(108, 76, 241, 0.4)` }}>
                                Get Started <ArrowRight size={18} />
                            </motion.button>
                        </Link>
                        <Link href="#events" style={{ textDecoration: 'none' }}>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '16px 32px', background: 'var(--card-bg)', color: 'var(--fg)', border: `1px solid var(--card-border)`, borderRadius: '30px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                Explore Events
                            </motion.button>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Floating 3D Dashboard Element */}
                <motion.div 
                    className="landing-mockup"
                    initial={{ opacity: 0, y: 100, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.7, duration: 1, type: 'spring' }}
                    style={{ marginTop: '80px', width: '90%', maxWidth: '1000px', height: '500px', background: 'var(--card-bg)', borderRadius: '24px', border: `1px solid var(--card-border)`, boxShadow: '0 30px 60px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', perspective: '1000px', zIndex: 10 }}
                >
                    {/* Mock Dashboard UI Header */}
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid var(--card-border)`, display: 'flex', gap: '8px', background: 'var(--bg)' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} />
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
                    </div>
                    
                    {/* Mock Dashboard Content */}
                    <div className="landing-mockup-inner" style={{ padding: '30px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', height: 'calc(100% - 50px)' }}>
                        
                        {/* Left Column (Event Feed) */}
                        <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '16px', color: 'var(--fg)' }}>Featured Event</div>
                            
                            {/* Mock Event Card */}
                            <div style={{ background: 'var(--card-bg)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', marginBottom: '16px' }}>
                                <div style={{ height: '120px', background: 'url(https://images.unsplash.com/photo-1540575467063-178a50c2df87) center/cover' }} />
                                <div style={{ padding: '16px' }}>
                                    <div style={{ color: C.primary, fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '4px' }}>TUESDAY, OCT 12</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '4px', color: 'var(--fg)' }}>Tech Innovators Summit</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>CMRIT Main Auditorium</div>
                                </div>
                            </div>
                            
                            {/* Mock Small Event */}
                            <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '12px', border: '1px solid var(--card-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', background: 'url(https://images.unsplash.com/photo-1505373877841-8d25f7d46678) center/cover', borderRadius: '8px' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--fg)' }}>AI Workshop</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Virtual • 250 attending</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Stats & Profile) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Stats */}
                            <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Your Portfolio</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: C.primary, marginBottom: '8px' }}>12</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Certificates Earned</div>
                            </div>

                            {/* Activity Chart Mock */}
                            <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '4px' }}>
                                <div style={{ color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: 'auto' }}>Activity</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '60px' }}>
                                    {[30, 50, 40, 80, 60].map((h, i) => (
                                        <div key={i} style={{ flex: 1, background: C.secondary, height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating Cards (Absolute Positioned over Dashboard) */}
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ position: 'absolute', top: '10%', left: '2%', background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid var(--card-border)`, zIndex: 20 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={20} /></div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--fg)' }}>QR Check-in</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Success</div>
                        </div>
                    </motion.div>

                    <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} style={{ position: 'absolute', top: '40%', right: '2%', background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid var(--card-border)`, zIndex: 20 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Award size={20} /></div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--fg)' }}>Certificate Earned</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Hackathon 2026</div>
                        </div>
                    </motion.div>

                    <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} style={{ position: 'absolute', bottom: '5%', left: '20%', background: 'var(--card-bg)', padding: '16px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid var(--card-border)`, zIndex: 20 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(108, 76, 241, 0.1)', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={20} /></div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--fg)' }}>AI Recommendation</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Found 2 Events</div>
                        </div>
                    </motion.div>
                </motion.div>
            </section>

            {/* SECTION 2: BENTO BOX / EVERYTHING STUDENTS NEED */}
            <section className="landing-section" style={{ padding: '120px 24px', background: 'var(--bg)', position: 'relative' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 className="landing-h2" style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '16px', color: 'var(--fg)' }}>One Platform. <span style={{ color: C.primary }}>Endless Possibilities.</span></h2>
                        <p className="landing-p" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Explore events, earn real experience, collect verified certificates, and build a portfolio that stands out.</p>
                    </motion.div>

                    <div className="landing-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        {[
                            { title: 'Discover Events', icon: <Search />, color: C.primary, desc: 'Find workshops, hackathons, and seminars tailored to your major.' },
                            { title: 'Smart Registrations', icon: <Ticket />, color: C.secondary, desc: 'One-click registrations without filling out forms repeatedly.' },
                            { title: 'QR Check-ins', icon: <ShieldCheck />, color: C.accent, desc: 'Scan your unique QR code at the door for instant attendance verification.' },
                            { title: 'Earn Certificates', icon: <Medal />, color: '#F59E0B', desc: 'Automatically receive cryptographically secure certificates post-event.' },
                            { title: 'AI Assistant', icon: <Zap />, color: C.primary, desc: 'Ask Linq for personalized club and event recommendations.' },
                            { title: 'Student Portfolio', icon: <Users />, color: C.secondary, desc: 'Turn your participation into proof with a beautifully formatted public portfolio.' },
                        ].map((item, i) => (
                            <motion.div 
                                key={i}
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.02, boxShadow: `0 20px 40px rgba(0,0,0,0.3)` }}
                                style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '24px', border: `1px solid var(--card-border)`, cursor: 'pointer', transition: 'all 0.3s' }}
                            >
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}15`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                    {item.icon}
                                </div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--fg)' }}>{item.title}</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3: AI CAMPUS ASSISTANT */}
            <section className="landing-section" style={{ padding: '120px 24px', background: `linear-gradient(135deg, ${C.primary} 0%, ${C.secondary} 100%)`, color: '#fff', overflow: 'hidden' }}>
                <div className="landing-grid" style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '60px', alignItems: 'center' }}>
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                        <h2 className="landing-h2" style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', marginBottom: '24px', lineHeight: '1.1' }}>Ask Linq Anything.</h2>
                        <p className="landing-p" style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: '1.6', marginBottom: '32px' }}>
                            Your intelligent campus assistant knows exactly what's happening. From finding machine learning clubs to building your portfolio, just ask.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                "What AI events are happening this week?"
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                "Recommend clubs for CS students."
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                "Show upcoming hackathons near me."
                            </div>
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', color: 'var(--fg)', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', borderBottom: `1px solid var(--card-border)`, paddingBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Zap size={20} /></div>
                            <div>
                                <div style={{ fontWeight: 'bold', color: 'var(--fg)' }}>Linq AI</div>
                                <div style={{ fontSize: '0.8rem', color: C.accent }}>Online</div>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: '16px 16px 16px 0', marginBottom: '16px', maxWidth: '80%', color: 'var(--fg)', border: '1px solid var(--card-border)' }}>
                            Hey! I found 3 AI-related events happening this week. The "GenAI Workshop" by GDSC is highly recommended for you!
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <div style={{ flex: 1, height: '48px', background: 'var(--bg)', borderRadius: '24px', border: `1px solid var(--card-border)` }} />
                            <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: C.primary }} />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* SECTION 4: STUDENT PORTFOLIO */}
            <section className="landing-section" style={{ padding: '120px 24px', background: 'var(--bg)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <motion.h2 className="landing-h2" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '16px', color: 'var(--fg)' }}>Turn Participation Into <span style={{ color: C.primary }}>Proof.</span></motion.h2>
                    <motion.p className="landing-p" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 60px' }}>
                        Your beautifully formatted public profile tracks skills, certificates, and achievements automatically.
                    </motion.p>

                    <div className="landing-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '60px' }}>
                        {[ {num: '5000+', lbl: 'Certificates'}, {num: '12000+', lbl: 'Registrations'}, {num: '300+', lbl: 'Events'}, {num: '100+', lbl: 'Clubs'} ].map((stat, i) => (
                            <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '24px', border: `1px solid var(--card-border)`, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', color: C.primary, marginBottom: '8px' }}>{stat.num}</div>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{stat.lbl}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 5: ROLE-BASED ACCESS & CLUB ECOSYSTEM */}
            <section className="landing-section" style={{ padding: '120px 24px', background: 'var(--card-bg)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <motion.h2 className="landing-h2" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '16px', color: 'var(--fg)' }}>Every Community. <span style={{ color: C.secondary }}>One Network.</span></motion.h2>
                    <motion.p className="landing-p" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '800px', margin: '0 auto 60px' }}>
                        Linq connects the entire campus hierarchy with secure, powerful role-based access.
                    </motion.p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                        {[
                            { role: 'College Admin', desc: 'Oversee all clubs, approve events, and view campus-wide analytics.' },
                            { role: 'Club Admin', desc: 'Create events, scan QR codes, and manage club members.' },
                            { role: 'Club Member', desc: 'Assist in organizing events and moderating activities.' },
                            { role: 'Student', desc: 'Discover events, register instantly, and build a digital portfolio.' },
                        ].map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%', maxWidth: '800px', background: 'var(--bg)', padding: '24px', borderRadius: '20px', border: `1px solid var(--card-border)`, textAlign: 'left' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>{4 - i}</div>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--fg)' }}>{item.role}</h3>
                                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 6: EVENT EXPERIENCE TIMELINE */}
            <section className="landing-section" style={{ padding: '120px 24px', background: 'var(--bg)' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <motion.h2 className="landing-h2" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: 'center', fontSize: '3rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '80px', color: 'var(--fg)' }}>The Seamless <span style={{ color: C.accent }}>Event Journey</span></motion.h2>
                    
                    <div className="landing-timeline" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        <div className="landing-timeline-line" style={{ position: 'absolute', top: '24px', left: '0', right: '0', height: '2px', background: 'var(--card-border)', zIndex: 0 }} />
                        {[ 'Register', 'Receive Ticket', 'QR Check-In', 'Attend Event', 'Submit Feedback', 'Earn Certificate' ].map((step, i) => (
                            <motion.div key={i} className="step-item" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '120px', textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', flexShrink: 0, borderRadius: '50%', background: 'var(--card-bg)', border: `2px solid ${C.primary}`, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(108,76,241,0.2)' }}>
                                    {i + 1}
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--fg)' }}>{step}</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 7: FEATURED EVENTS & TESTIMONIALS */}
            <section id="events" className="landing-section" style={{ padding: '120px 24px', background: 'var(--card-bg)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="landing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'flex-start' }}>
                        
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                            <h2 className="landing-h2" style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '24px', color: 'var(--fg)' }}>Featured Events</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {featuredEvents.map(event => (
                                    <div key={event.id} onClick={() => router.push(!user ? '/signup' : '/dashboard/student')} style={{ background: 'var(--bg)', padding: '24px', borderRadius: '20px', border: `1px solid var(--card-border)`, display: 'flex', gap: '20px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <div style={{ width: '100px', height: '100px', borderRadius: '12px', background: 'var(--card-bg)', overflow: 'hidden', flexShrink: 0 }}>
                                            {event.posterURL && <img src={event.posterURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <div style={{ color: C.primary, fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>{new Date(event.startTime).toLocaleDateString()}</div>
                                            <h3 style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--fg)' }}>{event.title}</h3>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>📍 {event.venue}</div>
                                        </div>
                                    </div>
                                ))}
                                {featuredEvents.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No upcoming global events right now.</div>}
                            </div>
                        </motion.div>

                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                            <h2 className="landing-h2" style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '24px', color: 'var(--fg)' }}>What Students Say</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {[
                                    { text: "Linq made checking into hackathons so easy. The QR code scanner is incredibly fast!", name: "Alex Chen", role: "CS Student", rating: '🤩' },
                                    { text: "I love that my certificates are automatically added to my portfolio. It's a game changer for internships.", name: "Sarah Miller", role: "Design Club Member", rating: '🤩' },
                                    { text: "The feedback section lets us see exactly what attendees thought using beautiful emoji ratings.", name: "David Kim", role: "Club Admin", rating: '😀' }
                                ].map((test, i) => (
                                    <div key={i} style={{ background: 'var(--bg)', padding: '32px', borderRadius: '24px', border: `1px solid var(--card-border)`, position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '2rem' }}>{test.rating}</div>
                                        <div style={{ display: 'flex', gap: '4px', color: '#eab308', marginBottom: '16px' }}><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
                                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '24px', color: 'var(--fg)' }}>"{test.text}"</p>
                                        <div style={{ fontWeight: 'bold', color: 'var(--fg)' }}>{test.name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px' }}>{test.role}</span></div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        
                    </div>
                </div>
            </section>

            {/* SECTION 8: ANALYTICS DASHBOARD MOCKUP */}
            <section className="landing-section" style={{ padding: '120px 24px', background: 'var(--bg)', textAlign: 'center' }}>
                <motion.h2 className="landing-h2" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '16px', color: 'var(--fg)' }}>Powerful <span style={{ color: C.primary }}>Analytics.</span></motion.h2>
                <motion.p className="landing-p" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 60px' }}>
                    Admins get real-time insights into event registrations, attendance rates, and club growth.
                </motion.p>
                
                <motion.div className="landing-padding-sm" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ maxWidth: '1000px', margin: '0 auto', background: 'var(--card-bg)', padding: '40px', borderRadius: '32px', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', border: `1px solid var(--card-border)` }}>
                    <div className="landing-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                        {[ {l: 'Registrations', v: '1,420'}, {l: 'Turnout Rate', v: '87%'}, {l: 'Avg Feedback', v: '4.8/5'} ].map((s,i) => (
                            <div key={i} style={{ background: 'var(--bg)', padding: '24px', borderRadius: '20px', border: `1px solid var(--card-border)` }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{s.l}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--fg)' }}>{s.v}</div>
                            </div>
                        ))}
                    </div>
                    <div className="landing-chart" style={{ height: '300px', background: `linear-gradient(to top, rgba(108,76,241,0.1) 0%, transparent 100%)`, borderRadius: '20px', border: `1px solid var(--card-border)`, display: 'flex', alignItems: 'flex-end', padding: '0 40px' }}>
                        {/* Mock Chart Bars */}
                        {[40, 60, 30, 80, 100, 70, 90].map((h, i) => (
                            <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.8 }} style={{ flex: 1, background: C.primary, margin: '0 5px', borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* SECTION 9: THE FUTURE (FINAL CTA) */}
            <section className="landing-section" style={{ padding: '160px 24px', background: `var(--card-bg)`, color: 'var(--fg)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '1000px', height: '1000px', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 60%)' }} />
                
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ position: 'relative', zIndex: 1 }}>
                    <h2 className="landing-h1" style={{ fontSize: '4.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', marginBottom: '32px', letterSpacing: '-1px' }}>
                        More Than Events. <br />
                        An Intelligent Campus Ecosystem.
                    </h2>
                    
                    <div className="landing-buttons" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link href="/signup" style={{ textDecoration: 'none', width: 'auto' }} className="mobile-full-width">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: '20px 40px', background: 'var(--fg)', color: 'var(--bg)', border: 'none', borderRadius: '40px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                                Join the Future of Campus Life
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Theme Aware Footer */}
            <footer style={{ padding: '60px 24px', background: 'var(--bg)', borderTop: `1px solid var(--card-border)`, textAlign: 'center', color: 'var(--fg)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '24px', color: C.primary }}>
                    <Zap size={24} fill="currentColor" />
                    <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', fontWeight: 'bold' }}>linq</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '32px', fontSize: '1rem', fontWeight: '500' }}>
                    <a href="#" style={{ color: 'var(--fg)', textDecoration: 'none' }}>Privacy Policy</a>
                    <a href="#" style={{ color: 'var(--fg)', textDecoration: 'none' }}>Terms of Service</a>
                    <a href="#" style={{ color: 'var(--fg)', textDecoration: 'none' }}>Help Center</a>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    © 2026 Linq Platform. All rights reserved. Built for the next generation.
                </div>
            </footer>
        </div>
    );
}
