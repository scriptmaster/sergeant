/** @jsx h */
import { h } from 'preact';
///**tsx_prefx**///
import { PageProps } from "../types/page.ts";
import AppleLayout from "../layouts/x/AppleLayout.tsx";

export function Services(props: PageProps) {
    return <AppleLayout title="Services">
        Services page
    </AppleLayout>
}
