-- Seed the 17 Wordmaster tasks

INSERT INTO tasks (title, description, category, suggested_time_seconds, judging_criteria) VALUES

-- Task 1
('The Most Patronizing Error Message',
'Write an error message that is technically helpful but deeply condescending. The user has entered an invalid email format. Make them question their life choices while still telling them what went wrong.',
'error_messages',
180,
'Actually communicates the error; Level of condescension achieved; Still technically usable; Creativity of the insult'),

-- Task 2
('Forbidden Words Challenge',
'Write a 30-word product pitch for a password manager. You CANNOT use: secure, safe, password, protect, remember, hack, breach, encrypt, vault, or trust.',
'product_copy',
180,
'No forbidden words used (automatic 1 if violated); Still clearly about password management; Compelling and clear; Creative word substitutions'),

-- Task 3
('The Anti-Dark Pattern',
'Here''s a dark pattern: "Are you sure you want to miss out on exclusive deals by unsubscribing?" Rewrite it as the most honest, ethical, user-respecting version possible while still being professional.',
'ethics_ux',
180,
'Removes manipulation completely; Still serves business purpose (gives option); Respectful tone; Maintains brand professionalism'),

-- Task 4
('Empty State Poetry',
'Write a haiku (5-7-5 syllables) for an empty shopping cart that is both useful AND emotionally resonant.',
'empty_states',
120,
'Correct haiku format; Actually helpful (implies next action); Emotional quality; Works as real UI'),

-- Task 5
('The Legal-Approved Love Letter',
'Write a romantic confession (3-4 sentences) that would survive legal review. Must include a disclaimer and avoid any promises that could be considered binding.',
'compliance',
180,
'Genuine romantic sentiment attempted; Legally defensible; Includes appropriate hedging; Humor in the compliance'),

-- Task 6
('Overly Honest CTA',
'Rewrite "Start Your Free Trial" to be 100% honest about what the user is actually signing up for (recurring charges, cancellation difficulty, email bombardment, etc.)',
'ctas',
120,
'Brutal honesty achieved; Still technically a CTA; Humor and creativity; Real-world accuracy'),

-- Task 7
('The Apology Escalation',
'Write THREE error messages for the same problem (server timeout), each progressively more apologetic than the last. Start professional, end desperate.',
'error_messages',
180,
'Clear escalation arc; Final message achieves absurd apology; First message is actually usable; Comedic timing'),

-- Task 8
('Microwave Instructions for Aliens',
'Write step-by-step instructions for using a microwave for someone who has never seen one and has no concept of "electricity" or "radiation." Max 5 steps.',
'instructional',
180,
'Actually functional instructions; Creative explanations of concepts; Would genuinely help an alien; Maintains UX writing brevity'),

-- Task 9
('The Passive-Aggressive Tooltip',
'Write a tooltip for a "Save" button that passive-aggressively reminds users they should have saved earlier.',
'help_text',
120,
'Peak passive-aggression; Still technically helpful; Workplace-appropriate (no profanity); Recognizable corporate tone'),

-- Task 10
('Success Message for Failure',
'The user''s file upload failed catastrophically. Write a "success" message that is technically accurate (something succeeded—the failure was successfully detected!) while being obviously absurd.',
'feedback',
150,
'Technical accuracy of the spin; Obvious absurdity; Corporate optimism satirized; Would make a user laugh (then cry)'),

-- Task 11
('The Permission Request Guilt Trip',
'Write a push notification permission request that guilt-trips the user into accepting WITHOUT being a dark pattern. Walk the line.',
'permissions',
180,
'Guilt successfully induced; NOT actually manipulative (fine line!); Still gives clear choice; Creative emotional leverage'),

-- Task 12
('Onboarding for the Immortal',
'Write the first onboarding tooltip for a to-do list app. The user is a 3,000-year-old vampire who has never needed to remember anything before. Max 40 words.',
'onboarding',
180,
'Works as real onboarding; Addresses immortal user problems; Stays in character; Actually helpful'),

-- Task 13
('The Compliment Sandwich Review Request',
'Write an in-app request for the user to leave a 5-star review using the "compliment sandwich" format: compliment, ask, compliment. Make it obvious what you''re doing.',
'feedback_requests',
150,
'Classic compliment sandwich structure; Meta-awareness is funny; Still might actually work; Appropriate desperation level'),

-- Task 14
('Loading State Existentialism',
'Write a loading message (max 15 words) that contemplates the nature of waiting and existence while the user''s data loads.',
'loading_states',
120,
'Genuine existential content; Under 15 words; Works as a loading state; Philosophical depth achieved'),

-- Task 15
('The Localization Disaster',
'Write a "Welcome back!" message that would be a localization nightmare. Pack in as many idioms, cultural references, and untranslatable phrases as possible while still being friendly.',
'localization',
180,
'Density of localization problems; Still readable in English; Friendly tone maintained; Translator would actually cry'),

-- Task 16: Terms of Service But Make It Gen Z
('Terms of Service, But Make It Gen Z',
'Rewrite this legal text in Gen Z speak: "By accessing this service, you agree to be bound by these terms and conditions." Keep it legally accurate.',
'legal',
180,
'Authentic Gen Z voice; Legally still says the same thing; Humor without cringe; Would actually work'),

-- Task 17: The Breakup Email from Your App
('The Breakup Email from Your App',
'The user is uninstalling your app. Write a 3-sentence farewell notification from the app''s perspective as if it''s being broken up with. Be dramatic but dignified.',
'retention',
180,
'Emotional range achieved; Dignity maintained; Not actually manipulative; Would make user pause');
