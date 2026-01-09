'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#eab308', '#3b82f6'];

export default function AnalyticsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(p => {
            const fetchData = async () => {
                try {
                    // Fetch Event
                    const eventSnap = await getDoc(doc(db, 'events', p.eventId));
                    if (eventSnap.exists()) {
                        setEvent({ id: eventSnap.id, ...eventSnap.data() } as Event);
                    }

                    // Fetch Registrations
                    const regRef = collection(db, `events/${p.eventId}/registrations`);
                    const regSnap = await getDocs(regRef);
                    const regs = regSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Registration[];
                    setRegistrations(regs);

                } catch (e) {
                    console.error("Error fetching analytics data", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        });
    }, [params]);

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading Analytics...</div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center text-white">Event not found</div>;

    // --- Metrics Calculation ---
    const totalRegistrations = registrations.length;
    const attendedCount = registrations.filter(r => r.attended).length;
    const conversionRate = totalRegistrations > 0 ? ((attendedCount / totalRegistrations) * 100).toFixed(1) : 0;

    // --- Chart Data Preparation ---

    // 1. Attendance Pie Chart
    const attendanceData = [
        { name: 'Attended', value: attendedCount },
        { name: 'Missed', value: totalRegistrations - attendedCount },
    ];

    // 2. Demographics (Conditional)
    const demographicsMap: Record<string, number> = {};
    const isGlobal = event.scope === 'GLOBAL';
    const demographicsTitle = isGlobal ? 'Demographics (By College)' : 'Demographics (By Branch)';

    registrations.forEach(r => {
        let key = 'Unknown';
        if (isGlobal) {
            // Use College Name
            key = r.userCollegeId || (r.userEmail.endsWith('cmrit.ac.in') ? 'CMRIT' : 'Unknown');
        } else {
            // Use Branch
            key = r.userBranch || 'Unknown';
        }
        demographicsMap[key] = (demographicsMap[key] || 0) + 1;
    });

    const demographicsData = Object.entries(demographicsMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10

    // 3. Registration Trend (Simple daily grouping)
    const trendMap: Record<string, number> = {};
    registrations.forEach(r => {
        const date = new Date(r.registeredAt).toLocaleDateString();
        trendMap[date] = (trendMap[date] || 0) + 1;
    });
    const trendData = Object.entries(trendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <Link href={`/events/${event.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.6, marginBottom: '16px', fontSize: '0.9rem' }}>
                        ← Back to Event
                    </Link>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2' }}>
                        Analytics: <span style={{ color: '#3b82f6' }}>{event.title}</span>
                    </h1>
                    <p style={{ opacity: 0.6 }}>Insights and performance metrics for your event.</p>
                </div>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                    <MetricCard title="Total Registrations" value={totalRegistrations} icon="📝" />
                    <MetricCard title="Actual Attendees" value={attendedCount} icon="👥" color="#22c55e" />
                    <MetricCard title="Conversion Rate" value={`${conversionRate}%`} icon="📈" color="#eab308" />
                </div>

                {/* Charts Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '30px' }}>

                    {/* Attendance Chart */}
                    <ChartCard title="Attendance Overview">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={attendanceData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {attendanceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#3f3f46'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Registration Trend */}
                    <ChartCard title="Registration Timeline">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.5} />
                                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickMargin={10} />
                                <YAxis stroke="#a1a1aa" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Demographics */}
                    <ChartCard title={demographicsTitle} fullWidth>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={demographicsData} layout="vertical" margin={{ left: 40, right: 40, top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" opacity={0.5} />
                                <XAxis type="number" stroke="#a1a1aa" hide />
                                <YAxis dataKey="name" type="category" width={150} stroke="#e4e4e7" fontSize={14} fontWeight={500} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={30} label={{ position: 'right', fill: '#fff' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                </div>
            </main>
        </div>
    );
}

function MetricCard({ title, value, icon, color = '#fff' }: { title: string, value: string | number, icon: string, color?: string }) {
    return (
        <div style={{ background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{title}</span>
                <span style={{ fontSize: '1.5rem', opacity: 0.8 }}>{icon}</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: color }}>{value}</div>
        </div>
    );
}

function ChartCard({ title, children, fullWidth = false }: { title: string, children: React.ReactNode, fullWidth?: boolean }) {
    return (
        <div style={{
            background: '#121214',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '24px',
            gridColumn: fullWidth ? '1 / -1' : 'auto'
        }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '24px', paddingLeft: '8px', borderLeft: '4px solid #3b82f6' }}>{title}</h3>
            {children}
        </div>
    );
}
