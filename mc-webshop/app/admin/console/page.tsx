'use client';

import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../utils/config';
import AdminAuthGuard from '../../components/AdminAuthGuard';

interface LogEntry {
    _id: string;
    type?: 'command' | 'response' | 'error' | 'info';
    command?: string;
    response?: string;
    sender?: string;
    content?: string; // For local info/error logs
    timestamp: string;
}

export default function ConsolePage() {
    const [command, setCommand] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [sending, setSending] = useState(false);
    const [senderName, setSenderName] = useState('Console');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);

    const scrollToBottom = () => {
        if (shouldAutoScrollRef.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            // unexpected small decimals can happen with scaling, 5px buffer is safe
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            shouldAutoScrollRef.current = isNearBottom;
        }
    };

    // Fetch sender name from settings
    useEffect(() => {
        fetch(`${API_URL}/api/settings`)
            .then(res => res.json())
            .then(data => {
                if (data.rconName) setSenderName(data.rconName);
            })
            .catch(err => console.error('Failed to fetch settings:', err));
    }, []);

    // Fetch logs and poll
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${API_URL}/api/rcon/logs`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLogs(data);
                }
            } catch (error) {
                console.error('Error fetching logs:', error);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const handleSendCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;

        const cmd = command.trim();
        setCommand('');
        setSending(true);
        shouldAutoScrollRef.current = true; // Force scroll on user action

        try {
            const res = await fetch(`${API_URL}/api/rcon/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd, senderName }),
            });
            const data = await res.json();

            if (!res.ok) {
                // Add local error log if request failed
                setLogs(prev => [...prev, {
                    _id: Date.now().toString(),
                    type: 'error',
                    content: data.error || 'Failed to send command',
                    timestamp: new Date().toISOString()
                }]);
            }
            // Success logs will be fetched by polling
            // We want to see our command immediately if possible, but polling handles it.
            // Force scroll again in case poll happens fast
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            setLogs(prev => [...prev, {
                _id: Date.now().toString(),
                type: 'error',
                content: 'Network error: Failed to connect to backend',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminAuthGuard>
            <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Server Console</h1>
                        <p className="text-gray-400 mt-2">Real-time RCON console • Logged in as <span className="text-[var(--primary)] font-bold">{senderName}</span></p>
                    </div>
                </div>

                <div className="flex-1 bg-[#1e1e1e] border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                    {/* Terminal Output */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-1 custom-scrollbar bg-black/20"
                    >
                        <div className="text-gray-500 mb-4 select-none">
                            Welcome to MC Webshop Admin Console v2.0<br />
                            Connected to RCON stream...<br />
                            ----------------------------------------
                        </div>
                        {logs.map((log) => (
                            <div key={log._id} className="break-words hover:bg-white/5 px-2 py-0.5 -mx-2 rounded transition-colors">
                                <span className="text-gray-600 mr-3 select-none">
                                    [{new Date(log.timestamp).toLocaleTimeString()}]
                                </span>

                                {log.type === 'error' ? (
                                    <span className="text-red-400">{log.content}</span>
                                ) : (
                                    <>
                                        {/* Command Line */}
                                        <div className="inline-block">
                                            <span className="text-blue-400 font-bold mr-2">{log.sender || 'Console'}:</span>
                                            <span className="text-yellow-400">{log.command}</span>
                                        </div>

                                        {/* Response Line (if exists) */}
                                        {log.response && (
                                            <div className="text-gray-300 pl-[5.5rem] whitespace-pre-wrap">
                                                {log.response}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#2a2a2a] border-t border-white/5">
                        <form onSubmit={handleSendCommand} className="flex gap-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">{'>'}</span>
                                <input
                                    type="text"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 bg-[#1e1e1e] border border-transparent rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:bg-[#1e1e1e] text-white placeholder-gray-600 font-mono outline-none"
                                    placeholder={`Type a command as ${senderName}...`}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending || !command.trim()}
                                className="px-8 py-3 bg-[var(--primary)] hover:brightness-110 text-black font-bold rounded-lg shadow-lg shadow-[var(--primary)]/20 transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AdminAuthGuard>
    );
}
