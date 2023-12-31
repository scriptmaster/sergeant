import React from 'react';
import { appSettings, topMenu } from "../../stores/app_settings.ts";

export default function AppleLayout(props: {title?: string, children: React.ReactNode}) {
    return <>
        <header  className={'double-nav-top '+(appSettings.value["site_theme"] || '')}>
            <nav>
                <span><a href="/">{appSettings.value["site_name"]}</a></span>
                <ul>
                    {topMenu.value.map((item: { name: string, path: string }) => {
                        return <li><a href={item.path}>{item.name}</a></li>
                    })}
                </ul>
            </nav>
        </header>
        <header>
            <nav>
                <span>{props.title || 'Welcome'}</span>
            </nav>
        </header>
        <main>{props.children}</main>
        <footer><div className="container">{appSettings.value["site_name"]}</div></footer>
    </>
}
