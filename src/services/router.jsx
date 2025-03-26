import axios from "axios";
export const BASEURL = "https://thesafeguardbackend-production.up.railway.app/"   //"http://127.0.0.1:4000"

export const api = axios.create({
    baseURL: BASEURL,
})