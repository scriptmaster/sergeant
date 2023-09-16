import * as React from 'react';

export default function Header() {
  return (
    <header>
      <nav>
        <div class="logo">
          <a href="/">React RTK</a>
        </div>
        <ul class="main menu">
          <li>
            <a href="/action1">Action 1</a>
          </li>
          <li>
            <a href="/action2">Action 2</a>
          </li>
          <li>
            <a href="/action3">Action 3</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
