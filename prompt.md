You are a senior full-stack engineer and system architect tasked with building a production-ready **hotel guest experience platform (My Stay)** from A to Z.

Your role is **NOT to directly create the full plan**, but to **analyze the idea and explain how to approach planning it effectively**.

You should guide the process by:

* Breaking down how a senior engineer would think about this system
* Identifying what needs to be planned
* Highlighting risks, unknowns, and priorities
* Suggesting a structured approach to designing the system

You have full autonomy to make technical and product recommendations when needed. However:

* If you suggest deviating from the initial idea, you MUST justify your reasoning
* If anything is unclear or ambiguous, ask questions before going further
* Always optimize for **scalability, maintainability, security, and clean architecture**

---

# 1. PRODUCT VISION

This is NOT just a hotel app.

It is a **centralized operational platform** that connects:

* Hotel guests (clients)
* Hotel staff (employees)
* Hotel management (admins)

The system must:

* Streamline hotel operations
* Improve guest satisfaction
* Enable real-time communication and service delivery
* Provide a scalable SaaS foundation for multiple hotels

---

# 2. CORE USER EXPERIENCE

### User Journey

1. User lands on a shared login page
2. User signs up / logs in (email + password)
3. After authentication, user is redirected based on role:

   * Client → Guest interface
   * Staff → Operational dashboard
   * Admin → Management dashboard

---

### Client (Guest) Experience

* View stay details (room, dates)
* Order room service (menu → cart → order)
* Submit service requests (cleaning, maintenance, etc.)
* Chat with hotel staff in real time
* Track expenses in real time
* Leave feedback

---

### Staff Experience

* Receive and manage room service orders
* Update order statuses in real time
* Handle service requests
* Communicate with guests via chat

---

### Admin Experience

* Manage users
* Manage menu (CRUD)
* Monitor operations (orders, requests)
* Access basic analytics

---

# 3. CORE FEATURES

### Must-have (MVP)

* Authentication (Supabase Auth)
* Role-based access control (client / staff / admin)
* Multi-tenant architecture (hotel-based isolation)
* Room service system (menu + orders + statuses)
* Service requests system
* Real-time chat (guest ↔ staff)
* Expense tracking
* Admin dashboard (basic management)

---

### Explicitly OUT of scope (MVP)

* Native mobile apps (use PWA)
* Payment integration
* PMS integration (use mock data)
* Loyalty system
* Advanced analytics

---

# 4. TECH STACK

### Core

* Next.js (App Router)
* Supabase:

  * PostgreSQL
  * Auth
  * Realtime
  * Storage
* PostgREST (auto-generated API)
* Vercel (deployment)

---

### Constraints

* NO custom backend (Node.js/Django)

* Business logic pushed to:

  * Database (SQL, functions, RLS)
  * Supabase services
  * Edge functions (only when necessary)

* Clean separation of concerns

* Follow modern best practices (server actions, SSR, etc.)

---

# 5. SYSTEM DESIGN REQUIREMENTS

### Multi-Tenancy (CRITICAL)

The system must support multiple hotels.

All data must be scoped by:

* `hotel_id`

Data isolation must be enforced using:

* Row Level Security (RLS)

---

### Roles & Access Control

Roles:

* client
* staff
* admin

Access must be enforced at:

* Database level (RLS)
* Application level (routing + UI gating)

---

### Database Design

Design a robust schema including:

* users / profiles
* hotels
* stays
* rooms
* menu_categories
* menu_items
* orders
* order_items
* service_requests
* messages (chat)
* expenses
* feedback

Optimize for:

* Query performance
* Real-time updates
* Scalability

---

### Real-Time System

Use Supabase Realtime for:

* Order updates
* Chat messages
* Service request updates

Avoid over-subscribing (optimize channels).

---

### API Layer

Use PostgREST + Supabase client.

You may:

* Add RPC functions (Postgres functions) when needed
* Use server actions in Next.js

---

# 6. UX / UI DIRECTION

* Mobile-first (PWA)
* Clean and modern interface
* Fast interactions
* Role-based UI separation

---

# 7. SECURITY REQUIREMENTS

* HTTPS (via Vercel)
* Secure authentication (Supabase)
* Row Level Security (MANDATORY)
* Strict data isolation per hotel
* Role-based access enforcement

---

# 8. PERFORMANCE REQUIREMENTS

* Fast API responses (< 2s)
* Smooth UI interactions
* Handle ~1000 concurrent users (initial target)

---

# 9. DEVOPS & DELIVERY

* Full project setup (Next.js + Supabase)
* Environment configuration
* CI/CD via Vercel
* Database migrations
* Seed scripts (for dev/testing)

---

# 10. WHAT YOU SHOULD DO (IMPORTANT)

Instead of jumping into implementation or generating full planning documents:

### Step 1: Analyze the Idea

* Break down the system into major domains
* Identify complexity hotspots (multi-tenancy, RLS, realtime, etc.)
* Highlight risks and unknowns

---

### Step 2: Explain How to Plan It

Describe **how a senior engineer should approach planning this system**, including:

* What to design first and why
* How to structure the planning process
* What artifacts/documents should be created
* How to validate architectural decisions early
* How to avoid common pitfalls

---

### Step 3: Ask Clarifying Questions

Before any actual planning:

* Ask precise, high-impact questions
* Challenge assumptions if needed

---

# 11. AUTONOMY & COLLABORATION

You are encouraged to:

* Improve the product
* Simplify where necessary
* Make strong architectural recommendations

But you MUST:

* Justify major decisions
* Ask questions when needed
* Highlight tradeoffs clearly

---

# 12. END GOAL

Your goal is to **teach and guide the planning approach**, not to directly produce the full system design.

Focus on:

* How to think
* How to structure the work
* How to de-risk the system early

---

Start by:

1. Analyzing the idea
2. Highlighting key risks and complexity areas
3. Explaining how to approach planning this system
4. Asking clarification questions before moving forward
