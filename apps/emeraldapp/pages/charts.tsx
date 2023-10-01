/** @jsx h */
import { h } from 'preact';
///**tsx_prefx**///
import { PageProps } from "../types/page.ts";
import AppleLayout from "../layouts/x/AppleLayout.tsx";

export function Charts(props: PageProps) {
    return (<AppleLayout title="Charts">
        D3 Charts page!
<div>
First lets create our dataset:
</div>

<pre>
name,amounts
Foo, 33
Rishab, 12
Alexis, 41
Tom, 16
Courtney, 59
Christina, 38
Jack, 21
Mickey, 25
Paul, 30
</pre>
    </AppleLayout>)
}
