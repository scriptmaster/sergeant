/** @jsx h */
import { h } from 'preact';
///**tsx_prefx**///
import { PageProps } from "../types/page.ts";
import AppleLayout from "../layouts/x/AppleLayout.tsx";

export function Home(props: PageProps) {
    return <AppleLayout title="Welcome">
        Welcome to Emerald
    </AppleLayout>
}
