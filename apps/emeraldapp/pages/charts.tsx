/** @jsx h */
import { h } from 'preact';
///**tsx_prefx**///
import { PageProps } from "../types/page.ts";
import AppleLayout from "../layouts/x/AppleLayout.tsx";

//import d3 from "d3";
import { LineChart } from '../components/charts/LineChart.tsx';

export function Charts(props: PageProps) {
    return (<AppleLayout title="Charts">
        D3 Charts page!
        <LineChart />
    </AppleLayout>)
}
