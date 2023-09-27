import React from 'react';

export default function AppleLayout(props: {children: React.ReactNode}) {
    return <>
        <header className="apple">Header</header>
        <main>{props.children}</main>
        <footer><div className="container">Footer</div></footer>
    </>
}
