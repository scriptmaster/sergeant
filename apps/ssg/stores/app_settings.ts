import { useSignal } from './signals.ts';

export const appSettings = useSignal({
    site_name: 'Emerald'
});

export const topMenu = useSignal([
    {name: 'Services', path: '/services'},
    {name: 'Private', path: '/private'},
    {name: 'Limited', path: '/limited'},
]);
