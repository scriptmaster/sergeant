/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment, ComponentChildren as Children } from 'preact';
///**tsx_prefx**///
import { appSettings, topMenu, pageMenu } from "../../stores/app_settings.ts";

export default function AppleLayout(props: {title?: string, children: Children}) {
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
                <ul>
                    {pageMenu.value[''].map((item: { name: string, path: string }) => {
                        return <li><a href={item.path}>{item.name}</a></li>
                    })}
                </ul>
            </nav>
        </header>
        <main>{props.children}</main>
        <footer><div className="container">{appSettings.value["site_name"]}</div></footer>
    </>
}
