import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI;
if (!MONGODB_URI) {
    throw new Error("MONGO_URI is not defined");
}

declare global {
    var mongooseCache: {
        conn : typeof mongoose | null;
        promise : Promise<typeof mongoose> | null;
    }
}

let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

export const connectToDatabase = async () =>{
    if(cached.conn) return cached.conn;

    if(!cached.promise){
        cached.promise = mongoose.connect(MONGODB_URI , {bufferCommands: false});

    }
    try { 
        cached.conn = await cached.promise;
         
    } catch (e: unknown){
        cached.promise = null;
        console.error(e);
        throw e;
    }

    console.log("Connected to MongoDB");
    return cached.conn;
}

export default connectToDatabase;
