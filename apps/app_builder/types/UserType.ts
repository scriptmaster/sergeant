export type UserType = { id: string, name: string };

export type FetchUserDataCallback = (data: UserType[]) => void;

export interface FetchUserRequest {
    limit?: number
}

export interface FetchUserResponse {
    data: JSON
}
