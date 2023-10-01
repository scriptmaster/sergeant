import { useSignal } from './signals.ts';

export const appSettings = useSignal({
    site_name: 'Emerald',
    site_theme: 'emerald',
});

export const topMenu = useSignal([
    {name: 'Services', path: '/services'},
    {name: 'Private', path: '/private'},
    {name: 'Limited', path: '/limited'},
]);

export const pageMenu = useSignal({
    '': [
        {name: 'Charts', path: '/charts'},
    ],
    '/services': {
        'Service 1': '/charts',
        'Timelog Service': '/timelog',
        'Multi-Project Management': '/program-management',
    }
})

