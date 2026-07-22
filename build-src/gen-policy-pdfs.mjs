import { writeFileSync } from 'fs';
import { buildResourcePdf } from './pdf.js';

const safeguarding = await buildResourcePdf({
  title: 'Safeguarding Policy',
  eyebrow: 'Policy Document',
  intro: 'Last updated: 14 July 2026 · Reviewed annually\n\nOur commitment to keeping the children and young people we work with safe.',
  sections: [
    {
      heading: 'Statement of intent',
      content: 'SEN Support Studio is committed to safeguarding and promoting the welfare of every child and young person we work with. Every child has the right to be protected from harm, regardless of age, disability, gender, race, religion or belief, sexual orientation, or identity. Safeguarding is everyone’s responsibility, and this policy sets out how SEN Support Studio meets that responsibility.'
    },
    {
      heading: 'Legal framework',
      content: 'This policy has regard to the principles set out in Working Together to Safeguard Children, Keeping Children Safe in Education, and the Children Act 1989 and 2004. Where SEN Support Studio delivers sessions on a school site, we also work within that school’s own safeguarding policy and procedures, and defer to their Designated Safeguarding Lead (DSL) as the first point of contact for any concern arising there.'
    },
    {
      heading: 'Who this applies to',
      content: 'This policy covers all sessions delivered by SEN Support Studio, whether in a school, in a family home, or online - 1:1 tuition, Sensory Profile Builder sessions, Support Sessions, and group interventions.'
    },
    {
      heading: 'Our safeguarding arrangements',
      content: 'Emma Owen, owner and sole practitioner of SEN Support Studio, holds an enhanced DBS (Disclosure and Barring Service) certificate, issued in August 2025, and is committed to renewing this at least every three years, or sooner if required.\n\nAs a sole practitioner, Emma Owen acts as the primary point of contact for any welfare concern arising from her own sessions, and is responsible for following the reporting procedure below without delay.'
    },
    {
      heading: 'Reporting a concern',
      content: 'If Emma Owen becomes concerned about a child’s welfare, or a child or parent/carer raises a concern with her, she will act promptly and follow the appropriate route:'
    },
    {
      heading: '',
      bullets: [
        'Sessions delivered in a school - the concern is raised with that school’s Designated Safeguarding Lead (DSL) in the first instance, following the school’s own safeguarding procedures.',
        'Sessions delivered in a family home, or elsewhere outside a school - the concern is raised directly with Kent County Council’s Local Authority Designated Officer (LADO) team.',
        'In an emergency, or if a child is at immediate risk of harm - 999 is called without delay.',
        'For advice on a concern that doesn’t need an immediate referral - the NSPCC helpline (0808 800 5000) is available for guidance.'
      ]
    },
    {
      heading: '',
      content: 'Concerns are recorded factually, in writing, and kept securely and confidentially, shared only with those who need to know in order to help keep the child safe.'
    },
    {
      heading: 'Confidentiality',
      content: 'Information about a child is treated as confidential and only shared with those directly involved in their care and education, such as parents/carers and, where relevant, school staff. This confidentiality does not extend to safeguarding concerns - where a child’s safety is at risk, sharing information to protect them will always take priority over confidentiality.'
    },
    {
      heading: 'Safe working practice',
      bullets: [
        'Home visits are only ever attended with a parent or carer present or aware, and appointment details (address, time) are shared with a trusted contact in advance as standard lone-working practice.',
        'Online sessions take place through reputable, secure platforms, with a parent, carer, or member of school staff aware the session is taking place.',
        'Physical contact with a child is kept to the minimum necessary for the activity (for example, appropriate support during a movement-based intervention), is always appropriate to the child’s age and needs, and is never in private with no other adult aware.',
        'Photography or recording of a child only takes place with explicit parental/carer or school consent, and images are stored securely and used only for the agreed purpose (such as a report for that child).',
        'Session reports and any information gathered about a child (including the Sensory Profile Builder questionnaire) are stored securely and access is limited to Emma Owen - see our Privacy Notice for more on how this data is handled.'
      ]
    },
    {
      heading: 'Reviewing this policy',
      content: 'This policy is reviewed at least annually, or sooner if guidance, legislation, or our ways of working change.'
    },
    {
      heading: 'Contact',
      content: 'Questions about this policy, or a safeguarding concern you’d like to raise, can be sent to hello@sensupportstudio.com. If a child is in immediate danger, please call 999.'
    }
  ],
  closing: 'SEN Support Studio · sensupportstudio.com'
});

writeFileSync('site/assets/documents/safeguarding-policy.pdf', safeguarding);
console.log('Wrote safeguarding-policy.pdf');

const privacy = await buildResourcePdf({
  title: 'Privacy Notice',
  eyebrow: 'Policy Document',
  intro: 'Last updated: 16 July 2026\n\nHow SEN Support Studio collects, uses and protects your personal data.',
  sections: [
    {
      heading: 'Who we are',
      content: 'SEN Support Studio Ltd (company number 17336332) is a Kent-based SEN tutoring and support practice, founded by Emma Owen. For the purposes of UK data protection law, SEN Support Studio Ltd is the "data controller" responsible for your personal data, and is registered with the Information Commissioner’s Office (registration reference ZC198538).\n\nContact: hello@sensupportstudio.com'
    },
    {
      heading: 'The personal data we collect',
      content: 'Depending on how you interact with us, we may collect:'
    },
    {
      heading: '',
      bullets: [
        'Contact details - name, email address, and whether you’re a parent/carer or a school, when you send an enquiry through our contact form.',
        'Booking details - name and email address when you book a session or request an invoice, along with the service and time you’ve chosen.',
        'Payment information - handled directly by our payment provider, Stripe. We do not see or store your card details.',
        'Information about a child - provided by a parent, carer, or school, such as the child’s name, date of birth, school and class, and, where a Sensory Profile Builder session is booked, detailed information about the child’s sensory processing, behaviours, and any relevant health-related or developmental information shared in the questionnaire or during sessions.',
        'Session records - notes and reports we prepare following tuition or support sessions, based on our work together.'
      ]
    },
    {
      heading: 'Why we collect it, and our lawful basis',
      bullets: [
        'Responding to enquiries - legitimate interest, in running our business and answering questions from prospective clients.',
        'Booking and delivering sessions - performance of a contract with you (or the school/organisation booking on a child’s behalf).',
        'Invoicing and payment - performance of a contract, and our legal obligation to keep financial records.',
        'The Sensory Profile Builder questionnaire - this includes information that can touch on a child’s health and development, which UK GDPR treats as a "special category" of data requiring extra care. We rely on your explicit consent, given by voluntarily completing and submitting the questionnaire, and we only use this information to prepare the sensory profile and inform our work with your child.'
      ]
    },
    {
      heading: '',
      content: 'We do not currently send marketing emails or newsletters. If that changes in future, we’ll only add you to any mailing list with your clear, separate consent, and you’ll always be able to opt out.'
    },
    {
      heading: 'Information about children',
      content: 'Where we hold information about a child, it is provided to us by a parent, carer, or school on the child’s behalf, rather than collected directly from the child. We take extra care with this information, limit access to it to Emma Owen, and only use it for the purpose it was shared - supporting that child’s tuition, sensory profile, or wellbeing.'
    },
    {
      heading: 'Who we share your data with',
      content: 'We use a small number of trusted service providers ("processors") to run the business. We don’t sell or share your data for marketing purposes. Current providers include:'
    },
    {
      heading: '',
      bullets: [
        'Resend - delivers emails sent from our website (enquiries, invoices, reports, questionnaire submissions).',
        'Google - powers our appointment booking calendar.',
        'Stripe - processes card payments directly; we never see your full card details.',
        'Cloudflare - hosts our website.'
      ]
    },
    {
      heading: '',
      content: 'Where a provider is based outside the UK, we rely on the legal safeguards they have in place (such as Standard Contractual Clauses) to protect your data in line with UK GDPR.'
    },
    {
      heading: 'How long we keep your data',
      bullets: [
        'General enquiries that don’t turn into a booking are kept for up to 6 months, then deleted.',
        'Client and family records (contact details, invoices, payment records) are kept for 6 years after our last contact, in line with standard UK business and tax record-keeping requirements.',
        'Session reports and Sensory Profile Builder questionnaires are kept for 1 year after our work together ends, unless a safeguarding concern has been raised - in which case those specific records are kept for longer, in line with safeguarding good practice, until the child’s 25th birthday.'
      ]
    },
    {
      heading: '',
      content: 'These are sensible defaults rather than fixed legal minimums, and we review them periodically.'
    },
    {
      heading: 'Your rights',
      content: 'Under UK GDPR, you have the right to:'
    },
    {
      heading: '',
      bullets: [
        'Ask what personal data we hold about you or your child, and get a copy of it.',
        'Ask us to correct inaccurate or incomplete data.',
        'Ask us to delete your data, where we’re not required to keep it for legal reasons.',
        'Ask us to restrict how we use your data, or object to certain uses.',
        'Ask for your data in a portable format, where technically possible.',
        'Withdraw consent at any time, where we’re relying on consent (such as the sensory questionnaire) - this won’t affect anything we did before you withdrew it.'
      ]
    },
    {
      heading: '',
      content: 'To exercise any of these rights, email hello@sensupportstudio.com. You also have the right to complain to the UK’s data protection regulator, the Information Commissioner’s Office (ICO) at ico.org.uk, if you’re unhappy with how we’ve handled your data.'
    },
    {
      heading: 'Cookies',
      content: 'Our website only uses cookies or similar technologies that are strictly necessary to make booking and payment work. We don’t currently use analytics or marketing/tracking cookies. If that changes, we’ll update this notice and, where required, ask for your consent first.'
    },
    {
      heading: 'Changes to this notice',
      content: 'We may update this notice from time to time, for example as our services or providers change. The date at the top shows when it was last updated.'
    },
    {
      heading: 'Contact us',
      content: 'If you have any questions about this notice or how we handle your data, email hello@sensupportstudio.com.'
    }
  ],
  closing: 'SEN Support Studio · sensupportstudio.com'
});

writeFileSync('site/assets/documents/privacy-notice.pdf', privacy);
console.log('Wrote privacy-notice.pdf');
