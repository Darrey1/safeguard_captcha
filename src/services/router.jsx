import axios from "axios";

// Use direct localhost URL
export const BASEURL = "https://thesafeguardbackend-production.up.railway.app/";

export const api = axios.create({
    baseURL: BASEURL,
});