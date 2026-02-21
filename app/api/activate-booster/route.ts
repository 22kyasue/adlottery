import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const MIN_UNIQUE_ENTRIES = 500;
const MAX_AGE_DAYS = 30;
const BOOSTER_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
    try {
        // 1. Auth
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Check if booster is already active
        const { data: userData } = await supabaseAdmin
            .from('users')
            .select('is_booster_active, booster_expires_at')
            .eq('id', user.id)
            .single();

        if (userData?.is_booster_active && userData.booster_expires_at) {
            const expires = new Date(userData.booster_expires_at);
            if (expires > new Date()) {
                return NextResponse.json({
                    error: 'Booster is already active.',
                    expiresAt: userData.booster_expires_at,
                }, { status: 400 });
            }
        }

        // 3. Parse uploaded file
        const formData = await request.formData();
        const file = formData.get('historyFile') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            return NextResponse.json({ error: 'File too large. Maximum 50MB.' }, { status: 400 });
        }

        const text = await file.text();
        const validation = validateHistoryFile(text, file.name);

        if (!validation.valid) {
            return NextResponse.json({
                error: validation.error,
                details: {
                    uniqueEntries: validation.uniqueEntries,
                    required: MIN_UNIQUE_ENTRIES,
                    recentEntries: validation.recentEntries,
                },
            }, { status: 400 });
        }

        // 4. Activate booster (validation passed — discard history data immediately)
        const expiresAt = new Date(Date.now() + BOOSTER_DURATION_MS).toISOString();

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                is_booster_active: true,
                booster_expires_at: expiresAt,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Failed to activate booster:', updateError);
            return NextResponse.json({ error: 'Failed to activate booster.' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            expiresAt,
            uniqueEntries: validation.uniqueEntries,
            recentEntries: validation.recentEntries,
        });

    } catch (error) {
        console.error('Activate booster error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

interface ValidationResult {
    valid: boolean;
    error?: string;
    uniqueEntries: number;
    recentEntries: number;
}

function validateHistoryFile(text: string, filename: string): ValidationResult {
    const thirtyDaysAgo = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    try {
        if (filename.endsWith('.json')) {
            return validateJSON(text, thirtyDaysAgo);
        } else if (filename.endsWith('.csv')) {
            return validateCSV(text, thirtyDaysAgo);
        } else {
            // Try JSON first, fall back to CSV
            try {
                return validateJSON(text, thirtyDaysAgo);
            } catch {
                return validateCSV(text, thirtyDaysAgo);
            }
        }
    } catch {
        return { valid: false, error: 'Unable to parse file. Please upload a valid JSON or CSV history export.', uniqueEntries: 0, recentEntries: 0 };
    }
}

function validateJSON(text: string, thirtyDaysAgo: Date): ValidationResult {
    const data = JSON.parse(text);

    // Handle various Chrome history export formats
    // Format 1: Array of { url, title, visitTime/lastVisitTime/time }
    // Format 2: { Browser History: [...] }
    let entries: any[] = [];
    if (Array.isArray(data)) {
        entries = data;
    } else if (data['Browser History'] && Array.isArray(data['Browser History'])) {
        entries = data['Browser History'];
    } else if (typeof data === 'object') {
        // Try to find any array property
        const arrayProp = Object.values(data).find(v => Array.isArray(v));
        if (arrayProp) entries = arrayProp as any[];
    }

    if (entries.length === 0) {
        return { valid: false, error: 'No browsing history entries found in file.', uniqueEntries: 0, recentEntries: 0 };
    }

    const uniqueUrls = new Set<string>();
    let recentCount = 0;

    for (const entry of entries) {
        const url = entry.url || entry.URL || entry.uri || '';
        const timeField = entry.visitTime || entry.lastVisitTime || entry.time ||
            entry.visit_time || entry.timestamp || entry.date || '';

        if (!url) continue;
        uniqueUrls.add(url);

        // Check if entry is within last 30 days
        const entryDate = parseEntryDate(timeField);
        if (entryDate && entryDate >= thirtyDaysAgo) {
            recentCount++;
        }
    }

    const uniqueEntries = uniqueUrls.size;

    if (uniqueEntries < MIN_UNIQUE_ENTRIES) {
        return {
            valid: false,
            error: `Not enough unique entries. Found ${uniqueEntries}, need at least ${MIN_UNIQUE_ENTRIES}.`,
            uniqueEntries,
            recentEntries: recentCount,
        };
    }

    if (recentCount < MIN_UNIQUE_ENTRIES) {
        return {
            valid: false,
            error: `Not enough recent entries (last 30 days). Found ${recentCount} recent entries, need at least ${MIN_UNIQUE_ENTRIES}.`,
            uniqueEntries,
            recentEntries: recentCount,
        };
    }

    return { valid: true, uniqueEntries, recentEntries: recentCount };
}

function validateCSV(text: string, thirtyDaysAgo: Date): ValidationResult {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { // header + at least 1 row
        return { valid: false, error: 'CSV file is empty or has no data rows.', uniqueEntries: 0, recentEntries: 0 };
    }

    const header = lines[0].toLowerCase();
    const urlCol = findColumnIndex(header, ['url', 'uri', 'address', 'link']);
    const dateCol = findColumnIndex(header, ['date', 'time', 'timestamp', 'visit_time', 'visittime', 'last_visit']);

    if (urlCol === -1) {
        return { valid: false, error: 'CSV must have a URL column.', uniqueEntries: 0, recentEntries: 0 };
    }

    const uniqueUrls = new Set<string>();
    let recentCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const url = cols[urlCol]?.trim();
        if (!url) continue;

        uniqueUrls.add(url);

        if (dateCol !== -1) {
            const entryDate = parseEntryDate(cols[dateCol]?.trim() || '');
            if (entryDate && entryDate >= thirtyDaysAgo) {
                recentCount++;
            }
        }
    }

    // If no date column, assume all entries are recent (lenient)
    if (dateCol === -1) {
        recentCount = uniqueUrls.size;
    }

    const uniqueEntries = uniqueUrls.size;

    if (uniqueEntries < MIN_UNIQUE_ENTRIES) {
        return {
            valid: false,
            error: `Not enough unique entries. Found ${uniqueEntries}, need at least ${MIN_UNIQUE_ENTRIES}.`,
            uniqueEntries,
            recentEntries: recentCount,
        };
    }

    return { valid: true, uniqueEntries, recentEntries: recentCount };
}

function parseEntryDate(value: string): Date | null {
    if (!value) return null;

    // Chrome Takeout format: microseconds since epoch (17-digit number)
    const asNumber = Number(value);
    if (!isNaN(asNumber) && asNumber > 1e15) {
        return new Date(asNumber / 1000); // microseconds to milliseconds
    }

    // Unix timestamp in seconds
    if (!isNaN(asNumber) && asNumber > 1e9 && asNumber < 1e13) {
        return new Date(asNumber * 1000);
    }

    // Unix timestamp in milliseconds
    if (!isNaN(asNumber) && asNumber >= 1e13 && asNumber < 1e16) {
        return new Date(asNumber);
    }

    // ISO string or other date format
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;

    return null;
}

function findColumnIndex(header: string, candidates: string[]): number {
    const cols = header.split(',').map(c => c.trim().replace(/"/g, ''));
    for (const candidate of candidates) {
        const idx = cols.findIndex(c => c.includes(candidate));
        if (idx !== -1) return idx;
    }
    return -1;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
