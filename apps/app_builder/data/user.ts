import { FetchUserDataCallback, UserType } from "../types/UserType.ts";

export function getOfflineData(): UserType[] {
    return [{
        id: '1', name: 'Offline 1',
    }];
}

export function fetchUserData(cb: FetchUserDataCallback) {
    fetch("https://jsonplaceholder.typicode.com/users")
        .then(response => {
            return response.json()
        })
        .then(data => {
            cb(data)
        })
}
