import { React } from "../../deps.react.ts";
import { fetchUserData, getOfflineData } from "../data/user.ts";
import { UserType } from "../types/UserType.ts";

const { useState, useEffect } = React;

export function GettingStartedPage() {
  const [users, setUsers] = useState(getOfflineData())

  useEffect(() => {
    fetchUserData(data => {
      setUsers(data);
    })
  }, []);

  return (
    <div>
      {users.length > 0 && (
        <ul>
          {users.map( (user: UserType) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
      <h1>Getting Started!</h1>
      <p>
        Getting started with React and Deno.
      </p>
    </div>
  );
}
