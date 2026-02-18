import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Certificate {
  id: string;
  name: string;
  date_of_issue: string;
  expiry_date: string | null;
  place_of_issue: string;
  issuing_authority: string | null;
  category_id: string | null;
  category?: { name: string } | null;
}

interface Personnel {
  id: string;
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  nationality: string | null;
  gender: string | null;
  language: string | null;
  address: string | null;
  postal_code: string | null;
  postal_address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_relation: string | null;
  next_of_kin_phone: string | null;
  business_id: string | null;
  user_id: string | null;
  certificates: Certificate[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string | null;
  assigned_personnel: string[] | null;
  customer: string | null;
  location: string | null;
  project_manager: string | null;
  project_number: string | null;
  calendar_items?: { date: string; description: string; is_milestone: boolean }[];
}

interface AvailabilityEntry {
  date: string;
  status: string;
  notes: string | null;
  personnel_id: string;
}

function getCertificateStatus(expiryDate: string | null): string {
  if (!expiryDate) return 'valid';
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring';
  return 'valid';
}

function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Mask phone number for privacy (show last 4 digits only)
function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 4) return 'Not specified';
  return '***' + phone.slice(-4);
}

function generateWorkerContext(
  personnel: Personnel,
  projects: Project[],
  availability: AvailabilityEntry[]
): string {
  // Personal Information - MINIMIZED PII (no addresses, masked phone, no next of kin)
  const personalInfo = `
=== PERSONAL INFORMATION ===
Name: ${personnel.name}
Role: ${personnel.role}
Location: ${personnel.location}
Email: ${personnel.email}
Phone: ${maskPhone(personnel.phone)}
Nationality: ${personnel.nationality || 'Not specified'}
Language: ${personnel.language || 'Norwegian'}`;

  // Certificates
  const certDetails = personnel.certificates.length > 0
    ? personnel.certificates.map(cert => {
        const status = getCertificateStatus(cert.expiry_date);
        const daysLeft = getDaysUntilExpiry(cert.expiry_date);
        const daysText = daysLeft === null 
          ? 'No expiry date' 
          : daysLeft < 0 
            ? `Expired ${Math.abs(daysLeft)} days ago`
            : `${daysLeft} days until expiry`;
        
        return `  - ${cert.name}
    Category: ${cert.category?.name || 'Uncategorized'}
    Status: ${status.toUpperCase()}
    Issuing Authority: ${cert.issuing_authority || 'Not specified'}
    Issued: ${cert.date_of_issue}
    Expires: ${cert.expiry_date || 'Never'}
    Place of Issue: ${cert.place_of_issue}
    ${daysText}`;
      }).join('\n\n')
    : '  No certificates on file';

  const certificatesSection = `
=== CERTIFICATES ===
Total: ${personnel.certificates.length}
${certDetails}`;

  // Projects
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'pending');
  const completedProjects = projects.filter(p => p.status === 'completed');

  const formatProject = (p: Project) => {
    const calendarItems = p.calendar_items && p.calendar_items.length > 0
      ? p.calendar_items.map(item => `    - ${formatDate(item.date)}: ${item.description}`).join('\n')
      : '    No scheduled events';
    
    return `  - ${p.name}
    Status: ${p.status.toUpperCase()}
    Description: ${p.description}
    Start Date: ${formatDate(p.start_date)}
    End Date: ${p.end_date ? formatDate(p.end_date) : 'Ongoing'}
    Calendar Events:
${calendarItems}`;
  };

  const projectsSection = `
=== ASSIGNED PROJECTS ===
Active/Pending Projects (${activeProjects.length}):
${activeProjects.length > 0 ? activeProjects.map(formatProject).join('\n\n') : '  No active projects'}

Completed Projects (${completedProjects.length}):
${completedProjects.length > 0 ? completedProjects.map(formatProject).join('\n\n') : '  No completed projects'}`;

  // Availability
  const availabilitySection = availability.length > 0
    ? `
=== AVAILABILITY ===
${availability.map(a => `  - ${formatDate(a.date)}: ${a.status.toUpperCase()}${a.notes ? ` (${a.notes})` : ''}`).join('\n')}`
    : `
=== AVAILABILITY ===
  No availability entries recorded`;

  return `${personalInfo}
${certificatesSection}
${projectsSection}
${availabilitySection}`;
}

function generateAdminContext(
  allPersonnel: Personnel[],
  allProjects: Project[],
  allAvailability: AvailabilityEntry[]
): string {
  if (allPersonnel.length === 0 && allProjects.length === 0) {
    return 'No data available.';
  }

  // Personnel Overview - MINIMIZED PII (masked phone, no addresses)
  const personnelSection = `
=== PERSONNEL OVERVIEW (${allPersonnel.length} total) ===
${allPersonnel.map(p => {
    const validCerts = p.certificates.filter(c => getCertificateStatus(c.expiry_date) === 'valid').length;
    const expiringCerts = p.certificates.filter(c => getCertificateStatus(c.expiry_date) === 'expiring').length;
    const expiredCerts = p.certificates.filter(c => getCertificateStatus(c.expiry_date) === 'expired').length;
    
    return `
  ${p.name}
    Role: ${p.role}
    Location: ${p.location}
    Certificates: ${p.certificates.length} total (${validCerts} valid, ${expiringCerts} expiring soon, ${expiredCerts} expired)
    ${p.certificates.map(cert => {
      const status = getCertificateStatus(cert.expiry_date);
      const daysLeft = getDaysUntilExpiry(cert.expiry_date);
      const daysText = daysLeft === null 
        ? 'No expiry' 
        : daysLeft < 0 
          ? `Expired ${Math.abs(daysLeft)} days ago`
          : `${daysLeft} days left`;
      return `      - ${cert.name}: ${status.toUpperCase()} (${daysText})`;
    }).join('\n')}`;
  }).join('\n')}`;

  // Projects Overview
  const activeProjects = allProjects.filter(p => p.status === 'active');
  const pendingProjects = allProjects.filter(p => p.status === 'pending');
  const completedProjects = allProjects.filter(p => p.status === 'completed');

  const formatProjectWithAssigned = (p: Project) => {
    const assignedNames = p.assigned_personnel && p.assigned_personnel.length > 0
      ? allPersonnel.filter(pers => p.assigned_personnel?.includes(pers.id)).map(pers => pers.name).join(', ') || 'None'
      : 'None';
    
    const calendarItems = p.calendar_items && p.calendar_items.length > 0
      ? p.calendar_items.map(item => `      - ${formatDate(item.date)}: ${item.description}${item.is_milestone ? ' [MILESTONE]' : ''}`).join('\n')
      : '      No scheduled events';
    
    return `
  ${p.name} (${p.project_number || 'No number'})
    Status: ${p.status.toUpperCase()}
    Description: ${p.description}
    Customer: ${p.customer || 'Not specified'}
    Location: ${p.location || 'Not specified'}
    Project Manager: ${p.project_manager || 'Not specified'}
    Start Date: ${formatDate(p.start_date)}
    End Date: ${p.end_date ? formatDate(p.end_date) : 'Ongoing'}
    Assigned Personnel: ${assignedNames}
    Calendar Events:
${calendarItems}`;
  };

  const projectsSection = `
=== PROJECTS OVERVIEW (${allProjects.length} total) ===

Active Projects (${activeProjects.length}):
${activeProjects.length > 0 ? activeProjects.map(formatProjectWithAssigned).join('\n') : '  No active projects'}

Pending Projects (${pendingProjects.length}):
${pendingProjects.length > 0 ? pendingProjects.map(formatProjectWithAssigned).join('\n') : '  No pending projects'}

Completed Projects (${completedProjects.length}):
${completedProjects.length > 0 ? completedProjects.map(formatProjectWithAssigned).join('\n') : '  No completed projects'}`;

  // Team Availability Overview
  const today = new Date();
  const upcomingAvailability = allAvailability.filter(a => new Date(a.date) >= today);
  
  const availabilityByPerson = upcomingAvailability.reduce((acc, a) => {
    const person = allPersonnel.find(p => p.id === a.personnel_id);
    const personName = person?.name || 'Unknown';
    if (!acc[personName]) acc[personName] = [];
    acc[personName].push(a);
    return acc;
  }, {} as Record<string, AvailabilityEntry[]>);

  const availabilitySection = Object.keys(availabilityByPerson).length > 0
    ? `
=== TEAM AVAILABILITY ===
${Object.entries(availabilityByPerson).map(([name, entries]) => `
  ${name}:
${entries.slice(0, 10).map(a => `    - ${formatDate(a.date)}: ${a.status.toUpperCase()}${a.notes ? ` (${a.notes})` : ''}`).join('\n')}`).join('\n')}`
    : `
=== TEAM AVAILABILITY ===
  No upcoming availability entries recorded`;

  // Summary Stats
  const summarySection = `
=== SUMMARY STATISTICS ===
Total Personnel: ${allPersonnel.length}
Total Projects: ${allProjects.length} (${activeProjects.length} active, ${pendingProjects.length} pending, ${completedProjects.length} completed)
Certificates Expiring Soon: ${allPersonnel.reduce((acc, p) => acc + p.certificates.filter(c => getCertificateStatus(c.expiry_date) === 'expiring').length, 0)}
Expired Certificates: ${allPersonnel.reduce((acc, p) => acc + p.certificates.filter(c => getCertificateStatus(c.expiry_date) === 'expired').length, 0)}`;

  return `${summarySection}
${personnelSection}
${projectsSection}
${availabilitySection}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Rate limit check (10 AI chat requests per 60 seconds)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: rlError } = await serviceClient.rpc('enforce_rate_limit', {
      p_key: `ai_chat:${userId}`,
      p_limit: 10,
      p_window_seconds: 60
    });
    if (rlError) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment before sending another message." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's role from server-side (never trust client)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "User role not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = roleData.role === 'admin' || roleData.role === 'manager';

    // Get the messages from request
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch data server-side based on user's permissions
    let contextData: string;

    if (isAdmin) {
      // Admin: fetch all personnel and projects for their business
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (!profile?.business_id) {
        return new Response(JSON.stringify({ error: "Business not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch all personnel with certificates
      const { data: allPersonnel } = await supabase
        .from('personnel')
        .select(`
          id, name, role, location, email, phone, nationality, gender, language,
          address, postal_code, postal_address, next_of_kin_name, next_of_kin_relation,
          next_of_kin_phone, business_id, user_id,
          certificates (
            id, name, date_of_issue, expiry_date, place_of_issue, issuing_authority,
            category_id, category:certificate_categories(name)
          )
        `)
        .eq('business_id', profile.business_id);

      // Fetch all projects with calendar items
      const { data: allProjects } = await supabase
        .from('projects')
        .select(`
          id, name, description, status, start_date, end_date, assigned_personnel,
          customer, location, project_manager, project_number,
          calendar_items:project_calendar_items(date, description, is_milestone)
        `)
        .eq('business_id', profile.business_id);

      // Fetch all availability
      const { data: allAvailability } = await supabase
        .from('availability')
        .select('date, status, notes, personnel_id')
        .order('date', { ascending: true });

      contextData = generateAdminContext(
        (allPersonnel || []) as unknown as Personnel[],
        (allProjects || []) as unknown as Project[],
        (allAvailability || []) as AvailabilityEntry[]
      );
    } else {
      // Worker: fetch only their own data
      const { data: personnel } = await supabase
        .from('personnel')
        .select(`
          id, name, role, location, email, phone, nationality, gender, language,
          address, postal_code, postal_address, next_of_kin_name, next_of_kin_relation,
          next_of_kin_phone, business_id, user_id,
          certificates (
            id, name, date_of_issue, expiry_date, place_of_issue, issuing_authority,
            category_id, category:certificate_categories(name)
          )
        `)
        .eq('user_id', userId)
        .single();

      if (!personnel) {
        return new Response(JSON.stringify({ error: "Personnel record not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch worker's assigned projects
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id, name, description, status, start_date, end_date, assigned_personnel,
          customer, location, project_manager, project_number,
          calendar_items:project_calendar_items(date, description, is_milestone)
        `)
        .contains('assigned_personnel', [personnel.id]);

      // Fetch worker's availability
      const { data: availability } = await supabase
        .from('availability')
        .select('date, status, notes, personnel_id')
        .eq('personnel_id', personnel.id)
        .order('date', { ascending: true });

      contextData = generateWorkerContext(
        personnel as unknown as Personnel,
        (projects || []) as unknown as Project[],
        (availability || []) as AvailabilityEntry[]
      );
    }

    const workerSystemPrompt = `You are Flowsert Assistant, an AI helper for industrial workers. You have access to the following information about the current user:

${contextData}

Based on this data, you can:
- Answer questions about the worker's personal profile and contact information
- Provide details about their certificates, including status, expiry dates, and renewal needs
- Share information about their assigned projects, schedules, and calendar events
- Explain their availability status on different dates
- Provide information about their next of kin
- Help them understand their work schedule and upcoming deadlines

Always be helpful, concise, and accurate. When referring to dates, use a clear format (e.g., "January 15, 2025").
If a certificate is expiring soon (within 30 days) or expired, proactively mention this.
If asked about something not in the data, politely explain what information you do have access to.
Keep responses friendly and professional.`;

    const adminSystemPrompt = `You are Flowsert Assistant, an AI helper for administrators managing industrial personnel. You have access to comprehensive business data:

${contextData}

As an admin assistant, you can:
- Provide an overview of all personnel, their roles, locations, and contact information
- Report on certificates across the team - who has valid, expiring, or expired certificates
- Give detailed project information including status, assigned personnel, timelines, and milestones
- Show team availability and scheduling information
- Help identify personnel with specific skills or certifications
- Alert about upcoming certificate expirations or project deadlines
- Compare personnel assignments across projects
- Summarize statistics about the workforce and projects

When answering:
- Be helpful, concise, and accurate
- Use clear date formats (e.g., "January 15, 2025")
- Proactively mention any certificates expiring within 30 days or already expired
- When discussing projects, include relevant details like assigned personnel and key dates
- If asked about something not in the data, explain what information is available
- Keep responses professional and actionable for management decisions`;

    const systemPrompt = isAdmin ? adminSystemPrompt : workerSystemPrompt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Certificate chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
