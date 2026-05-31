'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, use } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import Toast from '@/components/Toast';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Tooltip, Legend
} from 'recharts';
import { Users, TicketCheck, Building, Star, Calendar, Clock, MapPin, Tag, TrendingUp, X, Maximize2, Sparkles, Copy, CheckCircle, Image as ImageIcon } from 'lucide-react';

export default function AnalyticsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const { eventId } = use(params);

    const [eventData, setEventData] = useState<any>(null);
    const [organizer, setOrganizer] = useState<any>(null);
    
    // Recap States
    const [generating, setGenerating] = useState(false);
    const [recapData, setRecapData] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [editableRecap, setEditableRecap] = useState({ summary: '', winners: '', images: '', instagramRecap: '', linkedinRecap: '' });
    
    // Modal States
    const [isWrapUpModalOpen, setIsWrapUpModalOpen] = useState(false);

    const [stats, setStats] = useState({
        registered: 0,
        attended: 0,
        colleges: 0,
        avgRating: '0.0'
    });

    const [timelineData, setTimelineData] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [branchData, setBranchData] = useState<any[]>([]);
    const [ratingData, setRatingData] = useState<any[]>([]);
    const [collegeData, setCollegeData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedChart, setExpandedChart] = useState<string | null>(null);

    const PIE_COLORS_1 = ['#3b82f6', '#ef4444']; 
    const PIE_COLORS_2 = ['#8b5cf6', '#10b981', '#f59e0b', '#06b6d4']; 
    const RATING_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b']; 

    useEffect(() => {
        if (!eventId) return;

        const fetchData = async () => {
            try {
                // Fetch Event & Organizer
                const evSnap = await getDoc(doc(db, 'events', eventId));
                let cId = '';
                if (evSnap.exists()) {
                    const evData = evSnap.data();
                    setEventData(evData);
                    cId = evData.clubId;
                    if (evData.recapData) {
                        setRecapData(evData.recapData);
                        setEditableRecap({
                            summary: evData.recapData.eventSummary || '',
                            winners: evData.recapData.winnerShoutouts || '',
                            images: (evData.recapData.images || []).join('\n'),
                            instagramRecap: evData.recapData.instagramRecap || '',
                            linkedinRecap: evData.recapData.linkedinRecap || ''
                        });
                    }
                }
                if (cId) {
                    const clubSnap = await getDoc(doc(db, 'clubs', cId));
                    if (clubSnap.exists()) setOrganizer(clubSnap.data());
                }

                // Fetch Registrations
                const regRef = collection(db, `events/${eventId}/registrations`);
                const regSnap = await getDocs(regRef);
                const regList = regSnap.docs.map(d => d.data());

                const total = regList.length;
                const attended = regList.filter(r => r.attended).length;
                
                const uniqueColleges = new Set(regList.map(r => r.userCollegeId || 'Unknown'));

                // Fetch Feedback
                const fbRef = collection(db, `events/${eventId}/feedback`);
                const fbSnap = await getDocs(fbRef);
                const fbList = fbSnap.docs.map(d => d.data());

                let avgRating = 0;
                if (fbList.length > 0) {
                    const totalStars = fbList.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                    avgRating = totalStars / fbList.length;
                }

                setStats({
                    registered: total,
                    attended: attended,
                    colleges: uniqueColleges.size,
                    avgRating: avgRating.toFixed(1)
                });

                // 1. Attendance Data (Donut)
                setAttendanceData([
                    { name: 'Checked In', value: attended },
                    { name: 'No Show', value: total - attended }
                ]);

                // 2. Branch Data (Donut)
                const branchMap: Record<string, number> = {};
                regList.forEach(r => {
                    let br = r.userBranch || 'Other';
                    if (br.length > 15) br = br.substring(0, 15) + '...';
                    branchMap[br] = (branchMap[br] || 0) + 1;
                });
                setBranchData(Object.keys(branchMap).map(k => ({ name: k, value: branchMap[k] })));

                // 3. Rating Data (Donut)
                const ratingMap: Record<string, number> = { '5 Stars': 0, '4 Stars': 0, '3 Stars': 0, '2 Stars': 0, '1 Star': 0 };
                fbList.forEach(f => {
                    if (f.rating) {
                        const key = f.rating === 1 ? '1 Star' : `${f.rating} Stars`;
                        ratingMap[key] = (ratingMap[key] || 0) + 1;
                    }
                });
                setRatingData(Object.keys(ratingMap).map(k => ({ name: k, value: ratingMap[k] })).filter(d => d.value > 0));

                // 4. Registration Timeline (Line Chart)
                const timeMap: Record<string, number> = {};
                regList
                    .filter(r => r.registeredAt)
                    .sort((a, b) => a.registeredAt - b.registeredAt)
                    .forEach(r => {
                        const date = new Date(r.registeredAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                        timeMap[date] = (timeMap[date] || 0) + 1;
                    });
                setTimelineData(Object.keys(timeMap).map(k => ({ name: k, registrations: timeMap[k] })));

                // 5. Top Colleges (Tall Bar Chart)
                const collegeMap: Record<string, number> = {};
                regList.forEach(r => {
                    let col = r.userCollegeId || 'Unknown';
                    if (col === 'Global_College') col = 'CMRIT';
                    if (col.length > 20) col = col.substring(0, 17) + '...';
                    collegeMap[col] = (collegeMap[col] || 0) + 1;
                });
                const sortedColleges = Object.keys(collegeMap)
                    .sort((a, b) => collegeMap[b] - collegeMap[a])
                    .slice(0, 10); // Top 10 colleges
                
                setCollegeData(sortedColleges.map((k, i) => ({ 
                    college: k, 
                    students: collegeMap[k],
                    fill: PIE_COLORS_2[i % PIE_COLORS_2.length]
                })));

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    const handleGenerateWrapUp = async () => {
        if (!eventId) return;
        setGenerating(true);
        try {
            const res = await fetch('/api/magic-wrap-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const data = await res.json();
            if (data.success) {
                setRecapData(data.recapData);
                setEditableRecap({
                    summary: data.recapData.eventSummary || '',
                    winners: data.recapData.winnerShoutouts || '',
                    images: (data.recapData.images || []).join('\n'),
                    instagramRecap: data.recapData.instagramRecap || '',
                    linkedinRecap: data.recapData.linkedinRecap || ''
                });
                setToast({ message: 'AI Wrap-up generated successfully! ✨', type: 'success' });
            } else {
                setToast({ message: 'Failed to generate wrap-up: ' + data.error, type: 'error' });
            }
        } catch (e) {
            setToast({ message: 'An error occurred while generating.', type: 'error' });
        } finally {
            setGenerating(false);
        }
    };

    const handlePublishWallOfLove = async () => {
        if (!recapData || !eventId) return;
        try {
            const updatedRecap = {
                ...recapData,
                eventSummary: editableRecap.summary,
                winnerShoutouts: editableRecap.winners,
                images: editableRecap.images.split('\n').map(s => s.trim()).filter(s => s),
                instagramRecap: editableRecap.instagramRecap,
                linkedinRecap: editableRecap.linkedinRecap,
                published: true
            };
            await updateDoc(doc(db, 'events', eventId), { recapData: updatedRecap });
            setRecapData(updatedRecap);
            setToast({ message: 'Wall of Love published to students! 🎉', type: 'success' });
        } catch (e) {
            setToast({ message: 'Failed to publish Wall of Love.', type: 'error' });
        }
    };



    if (loading) return <div className="min-h-screen grid place-items-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}>Loading Analytics...</div>;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '12px 16px', borderRadius: '12px', boxShadow: 'var(--card-glow)' }}>
                    {label && <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--fg)', marginBottom: '8px', fontSize: '0.9rem' }}>{label}</p>}
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ margin: 0, color: 'var(--fg)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color || entry.payload?.fill || '#3b82f6' }}></span>
                            {entry.name}: <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderLegend = (props: any) => {
        const { payload } = props;
        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                {payload.map((entry: any, index: number) => (
                    <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                        {entry.value}
                    </li>
                ))}
            </ul>
        );
    };

    // Helper to render specific charts so we can reuse them in the modal
    const renderChart = (type: string) => {
        switch (type) {
            case 'Attendance':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={attendanceData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value" stroke="none">
                                {attendanceData.map((e, i) => <Cell key={i} fill={PIE_COLORS_1[i % PIE_COLORS_1.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={renderLegend} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'Branch':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={branchData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value" stroke="none">
                                {branchData.map((e, i) => <Cell key={i} fill={PIE_COLORS_2[i % PIE_COLORS_2.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={renderLegend} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            case 'Rating':
                return (
                    ratingData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={ratingData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" paddingAngle={5} dataKey="value" stroke="none">
                                    {ratingData.map((e, i) => <Cell key={i} fill={RATING_COLORS[i % RATING_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend content={renderLegend} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Ratings</div>
                );
            case 'Timeline':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--card-border)' }} />
                            <Line type="monotone" dataKey="registrations" name="Signups" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'Colleges':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={collegeData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="college" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={10} angle={-30} textAnchor="end" />
                            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--hover-bg)' }} />
                            <Bar dataKey="students" name="Students" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                {collegeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 24px 80px' }}>

                {/* Breadcrumbs */}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: '500' }}>
                    <Link href="/dashboard/club-member" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link> 
                    <span style={{ margin: '0 8px' }}>»</span> 
                    <Link href={`/events/${eventId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Events</Link> 
                    <span style={{ margin: '0 8px' }}>»</span> 
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{eventData?.title || 'Analytics'}</span>
                </div>

                {/* Header Grid: Event Info & Organizer */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '30px' }}>
                    
                    {/* Event Banner Card */}
                    <div style={{ gridColumn: 'span 12' }}>
                        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '24px', display: 'flex', gap: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flexWrap: 'wrap' }}>
                            <div style={{ width: '200px', height: '140px', borderRadius: '16px', backgroundColor: 'var(--hover-bg)', overflow: 'hidden', flexShrink: 0 }}>
                                {eventData?.posterURL ? (
                                    <img src={eventData.posterURL} alt="Event Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Image</div>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h1 style={{ fontSize: '2rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '16px', color: 'var(--fg)' }}>
                                    {eventData?.title}
                                </h1>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {eventData?.startTime ? new Date(eventData.startTime).toLocaleDateString() : 'TBD'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {eventData?.startTime ? new Date(eventData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {eventData?.venue || 'TBD'}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Tag size={12} /> Tech & Innovation
                                        </span>
                                    </div>
                                    {organizer && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'var(--hover-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg)', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                                                {organizer.logoURL ? <img src={organizer.logoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🏫</div>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Hosted By</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--fg)', lineHeight: '1' }}>{organizer.name}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scorecards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                    
                    {/* Card 1 */}
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '12px' }}>No. of registrations</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', lineHeight: '1', marginBottom: '12px' }}>{stats.registered}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <TrendingUp size={12} /> Active Data
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TicketCheck size={20} />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '12px' }}>No. of attendees</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', lineHeight: '1', marginBottom: '12px' }}>{stats.attended}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <TrendingUp size={12} /> Actual Turnout
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building size={20} />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '12px' }}>Colleges represented</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', lineHeight: '1', marginBottom: '12px' }}>{stats.colleges}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <TrendingUp size={12} /> Diverse Audience
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={20} />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '12px' }}>Average Rating</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', lineHeight: '1', marginBottom: '12px' }}>{stats.avgRating}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <TrendingUp size={12} /> Feedback Score
                        </div>
                    </div>

                </div>

                {/* AI Magic Wrap-up Section (Trigger) */}
                {eventData?.status === 'ENDED' && (
                    <div 
                        onClick={() => setIsWrapUpModalOpen(true)}
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: '24px', padding: '32px', marginBottom: '40px', boxShadow: '0 8px 32px rgba(147, 51, 234, 0.3)', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: '#fff', opacity: 0.1, filter: 'blur(40px)', borderRadius: '50%' }}></div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 10 }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={32} />
                            </div>
                            <div style={{ color: '#fff' }}>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, fontFamily: 'var(--font-outfit)', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>AI Magic Wrap-up</h2>
                                <p style={{ margin: '4px 0 0', fontSize: '1rem', opacity: 0.9 }}>Open the Event Recap & Wall of Love Dashboard ✨</p>
                            </div>
                        </div>
                        <div style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold' }}>
                            Open Dashboard →
                        </div>
                    </div>
                )}

                {/* 3 Column Charts Grid */}
                <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

                    {/* Column 1: Demographics (Two stacked donuts) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        <div 
                            style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flex: 1, minHeight: '300px', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => setExpandedChart('Attendance')}
                        >
                            <Maximize2 size={16} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', marginBottom: '20px' }}>Attendance Status</h3>
                            <div style={{ height: '200px', pointerEvents: 'none' }}>
                                {renderChart('Attendance')}
                            </div>
                        </div>

                        <div 
                            style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flex: 1, minHeight: '300px', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => setExpandedChart('Branch')}
                        >
                            <Maximize2 size={16} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', marginBottom: '20px' }}>Branch Breakdown</h3>
                            <div style={{ height: '200px', pointerEvents: 'none' }}>
                                {renderChart('Branch')}
                            </div>
                        </div>

                    </div>

                    {/* Column 2: Timeline (Donut + Line Chart) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        <div 
                            style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', height: '300px', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => setExpandedChart('Rating')}
                        >
                            <Maximize2 size={16} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', marginBottom: '20px' }}>Rating Spread</h3>
                            <div style={{ height: '200px', pointerEvents: 'none' }}>
                                {renderChart('Rating')}
                            </div>
                        </div>

                        <div 
                            style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flex: 1, minHeight: '300px', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => setExpandedChart('Timeline')}
                        >
                            <Maximize2 size={16} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', marginBottom: '20px' }}>Registrations Over Time</h3>
                            <div style={{ height: '200px', pointerEvents: 'none' }}>
                                {renderChart('Timeline')}
                            </div>
                        </div>

                    </div>

                    {/* Column 3: Engagement (Tall Bar Chart) */}
                    <div 
                        style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        onClick={() => setExpandedChart('Colleges')}
                    >
                        <Maximize2 size={16} style={{ position: 'absolute', top: '24px', right: '24px', color: 'var(--text-muted)', opacity: 0.5 }} />
                        <div style={{ marginBottom: '30px' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)' }}>Top Colleges Represented</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <strong>What is this?</strong> This chart shows the distribution of attendees across different colleges, sorted by the highest attendance.
                            </p>
                        </div>
                        <div style={{ flex: 1, minHeight: '500px', pointerEvents: 'none' }}>
                            {renderChart('Colleges')}
                        </div>
                    </div>

                </div>

            </main>

            {/* Floating Window Chart Modal */}
            {expandedChart && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '1000px', height: '80vh', borderRadius: '32px', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: '40px', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'fadeIn 0.2s ease-out' }}>
                        
                        <button 
                            onClick={() => setExpandedChart(null)}
                            style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--hover-bg)', border: 'none', color: 'var(--fg)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', marginBottom: '8px' }}>
                            {expandedChart === 'Attendance' && 'Attendance Status'}
                            {expandedChart === 'Branch' && 'Branch Breakdown'}
                            {expandedChart === 'Rating' && 'Rating Spread'}
                            {expandedChart === 'Timeline' && 'Registrations Over Time'}
                            {expandedChart === 'Colleges' && 'Top Colleges Represented'}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>Expanded View for clearer analysis.</p>

                        <div style={{ flex: 1, minHeight: '300px', width: '100%', position: 'relative' }}>
                            {renderChart(expandedChart)}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Magic Wrap-up Modal */}
            {isWrapUpModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '1200px', height: '90vh', borderRadius: '32px', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'fadeIn 0.2s ease-out', overflow: 'hidden' }}>
                        
                        {/* Header */}
                        <div style={{ padding: '32px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--fg)', margin: 0, fontFamily: 'var(--font-outfit)' }}>AI Magic Wrap-up Dashboard</h2>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Generate Instagram recaps and build your Wall of Love.</p>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {!recapData && (
                                    <button 
                                        onClick={handleGenerateWrapUp}
                                        disabled={generating}
                                        style={{ padding: '12px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1, transition: 'transform 0.2s' }}
                                    >
                                        {generating ? <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : <Sparkles size={18} />}
                                        {generating ? 'Generating Magic...' : 'Generate AI Wrap-up ✨'}
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsWrapUpModalOpen(false)}
                                    style={{ background: 'var(--hover-bg)', border: 'none', color: 'var(--fg)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'var(--bg)' }}>
                            {recapData ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    
                                    {/* Left: Social Media Recaps */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        
                                        {/* Instagram */}
                                        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '32px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--fg)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={20} color="#ec4899"/> Instagram</h3>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(editableRecap.instagramRecap);
                                                        setToast({ message: 'Copied to clipboard!', type: 'success' });
                                                    }}
                                                    style={{ background: 'var(--hover-bg)', border: 'none', color: 'var(--fg)', padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                >
                                                    <Copy size={16} /> Copy
                                                </button>
                                            </div>
                                            <textarea 
                                                value={editableRecap.instagramRecap}
                                                onChange={e => setEditableRecap(p => ({ ...p, instagramRecap: e.target.value }))}
                                                style={{ width: '100%', flex: 1, minHeight: '200px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px', color: 'var(--fg)', fontSize: '0.95rem', resize: 'none', outline: 'none', lineHeight: '1.6' }}
                                            />
                                        </div>

                                        {/* LinkedIn */}
                                        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '32px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--fg)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={20} color="#3b82f6"/> LinkedIn</h3>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(editableRecap.linkedinRecap || '');
                                                        setToast({ message: 'Copied to clipboard!', type: 'success' });
                                                    }}
                                                    style={{ background: 'var(--hover-bg)', border: 'none', color: 'var(--fg)', padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}
                                                >
                                                    <Copy size={16} /> Copy
                                                </button>
                                            </div>
                                            <textarea 
                                                value={editableRecap.linkedinRecap || ""}
                                                placeholder="LinkedIn recap will appear here for new generations. Click 'Generate AI Wrap-up' again to fetch it!"
                                                onChange={e => setEditableRecap(p => ({ ...p, linkedinRecap: e.target.value }))}
                                                style={{ width: '100%', flex: 1, minHeight: '200px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px', color: 'var(--fg)', fontSize: '0.95rem', resize: 'none', outline: 'none', lineHeight: '1.6' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right: Wall of Love Builder */}
                                    <div style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '32px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--card-glow)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--fg)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>💖 Wall of Love Builder</h3>
                                            {recapData.published && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '12px' }}><CheckCircle size={16} /> Published Live</span>}
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>AI Event Summary</label>
                                            <textarea 
                                                value={editableRecap.summary}
                                                onChange={e => setEditableRecap(p => ({ ...p, summary: e.target.value }))}
                                                style={{ width: '100%', height: '120px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px', color: 'var(--fg)', fontSize: '0.95rem', resize: 'none', outline: 'none', lineHeight: '1.5' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>Winner Shoutouts / Prizes (Optional)</label>
                                            <textarea 
                                                placeholder="e.g. 1st Place: Team Alpha 🏆"
                                                value={editableRecap.winners}
                                                onChange={e => setEditableRecap(p => ({ ...p, winners: e.target.value }))}
                                                style={{ width: '100%', height: '80px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px', color: 'var(--fg)', fontSize: '0.95rem', resize: 'none', outline: 'none', lineHeight: '1.5' }}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>
                                                <span><ImageIcon size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }}/> Event Memories (Image URLs, one per line)</span>
                                            </label>
                                            <textarea 
                                                placeholder="https://..."
                                                value={editableRecap.images}
                                                onChange={e => setEditableRecap(p => ({ ...p, images: e.target.value }))}
                                                style={{ width: '100%', height: '100px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '16px', color: 'var(--fg)', fontSize: '0.95rem', resize: 'none', outline: 'none', lineHeight: '1.5' }}
                                            />
                                        </div>

                                        <button 
                                            onClick={handlePublishWallOfLove}
                                            style={{ width: '100%', padding: '16px', background: recapData.published ? 'var(--hover-bg)' : 'var(--primary)', color: recapData.published ? 'var(--fg)' : '#fff', border: recapData.published ? '1px solid var(--card-border)' : 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', transition: 'transform 0.2s', marginTop: 'auto' }}
                                        >
                                            {recapData.published ? 'Update Wall of Love' : 'Publish Wall of Love 🚀'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    <div style={{ width: '100px', height: '100px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                        <Sparkles size={48} color="var(--primary)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)', marginBottom: '12px' }}>Ready to make magic?</h3>
                                    <p style={{ maxWidth: '400px', lineHeight: '1.6', marginBottom: '32px' }}>Click the Generate button above to let AI read through all attendee feedback and automatically create your Wall of Love and Instagram recap!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
}
