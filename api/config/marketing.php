<?php

/*
|--------------------------------------------------------------------------
| Product website content
|--------------------------------------------------------------------------
|
| Default text for each section of the marketing site. Platform staff edit these
| from the admin dashboard; edits are stored in the site_content table and
| override the values here. Plans and prices come from the plans table.
|
*/

return [
    'sections' => [
        'hero' => [
            'eyebrow' => 'For teachers, lecturers, schools and universities',
            'title' => 'Less admin. More teaching.',
            'subtitle' => 'Grades, attendance, live lectures, recordings and messages in one calm place — with a dedicated app for students and families.',
            'primary_cta' => 'Start your 14-day free trial',
            'secondary_cta' => 'See packages',
        ],

        'stats' => [
            ['value' => '14 days', 'label' => 'Free trial, no card'],
            ['value' => '5 min', 'label' => 'To set up a school'],
            ['value' => '99.9%', 'label' => 'Uptime target'],
            ['value' => 'E2E', 'label' => 'Encrypted messages'],
        ],

        'audiences' => [
            [
                'key' => 'teacher',
                'title' => 'Teachers & lecturers',
                'subtitle' => 'Run your own classes, tutoring groups or university modules.',
                'benefits' => ['Gradebook and attendance in minutes', 'Live lectures with automatic recordings', 'Your own public page', 'Students follow along on their phones'],
            ],
            [
                'key' => 'school',
                'title' => 'Schools',
                'subtitle' => 'Teachers, students and parents on one platform.',
                'benefits' => ['Parent portal to follow each child', 'Reports and exports for administrators', 'Announcements with deadlines and reminders', 'Required two-factor sign-in for staff'],
            ],
            [
                'key' => 'university',
                'title' => 'Universities',
                'subtitle' => 'Departments, large cohorts and live lectures at scale.',
                'benefits' => ['Zoom lectures with cloud recordings', 'Custom domain and branding', 'Analytics across courses and terms', 'Data residency and dedicated support'],
            ],
            [
                'key' => 'family',
                'title' => 'Students & families',
                'subtitle' => 'Everything about school, in one friendly app.',
                'benefits' => ['Grades and feedback as soon as they are posted', 'Attendance and alerts for parents', 'Join live lessons and watch recordings', 'Message teachers privately'],
            ],
        ],

        'features' => [
            ['icon' => 'video', 'title' => 'Live lessons', 'body' => 'Schedule Zoom or Jitsi lectures. Students get reminders, join in one tap, and recordings land on the course page.'],
            ['icon' => 'grades', 'title' => 'Gradebook', 'body' => 'Weighted assessments, feedback and grade trends for every student.'],
            ['icon' => 'attendance', 'title' => 'Attendance', 'body' => 'Take the roll on any phone, even offline. Live lessons take attendance automatically.'],
            ['icon' => 'family', 'title' => 'Family portal', 'body' => 'Parents follow each child’s grades, attendance and deadlines, with alerts when something slips.'],
            ['icon' => 'messages', 'title' => 'Private messaging', 'body' => 'End-to-end encrypted chat between teachers, students and parents.'],
            ['icon' => 'analytics', 'title' => 'Analytics & reports', 'body' => 'Attendance rates, at-risk students and CSV exports for administrators.'],
            ['icon' => 'security', 'title' => 'Secure by default', 'body' => 'Two-factor sign-in, role-based access, encrypted records and a full audit trail.'],
            ['icon' => 'mobile', 'title' => 'Mobile apps', 'body' => 'iOS and Android apps with biometric unlock and push notifications.'],
        ],

        'testimonials' => [
            ['quote' => 'Taking attendance used to eat the first ten minutes of every class. Now it takes thirty seconds.', 'name' => 'Amina R.', 'role' => 'Maths teacher'],
            ['quote' => 'Our lecturers record every session automatically. Students love being able to rewatch.', 'name' => 'Dr. Karim H.', 'role' => 'Faculty of Engineering'],
            ['quote' => 'I finally know how my son is doing before the report card arrives.', 'name' => 'Sofia M.', 'role' => 'Parent'],
        ],

        'faq' => [
            ['question' => 'Is there a free trial?', 'answer' => 'Yes. Every package starts with 14 days free and no credit card.'],
            ['question' => 'Do parents and students pay?', 'answer' => 'No. The school, university or teacher subscribes; students and families use Manara for free.'],
            ['question' => 'Do I need a Zoom account for live lessons?', 'answer' => 'No. Lessons work out of the box with Jitsi Meet. Connect Zoom to get automatic cloud recordings.'],
            ['question' => 'Can we export our data?', 'answer' => 'Yes. Grades and attendance export to CSV at any time, and every user can download their own data.'],
            ['question' => 'Where is our data stored?', 'answer' => 'In encrypted, backed-up cloud storage. The University package offers data residency.'],
        ],

        'cta' => [
            'title' => 'Set up your classroom in five minutes',
            'subtitle' => 'Create a workspace, add your courses, invite your students and their families.',
            'button' => 'Get started free',
        ],
    ],
];
