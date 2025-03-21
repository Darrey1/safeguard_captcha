import axios from "axios";
export const BASEURL = "http://127.0.0.1:4000"

export const api = axios.create({
    baseURL: BASEURL,
})