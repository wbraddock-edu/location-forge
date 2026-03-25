import { locations, type Location, type InsertLocation } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  createLocation(data: InsertLocation): Location;
  getLocation(id: number, visitorId: string): Location | undefined;
  getLocationsByVisitor(visitorId: string): Location[];
  deleteLocation(id: number, visitorId: string): void;
}

export class DatabaseStorage implements IStorage {
  createLocation(data: InsertLocation): Location {
    return db.insert(locations).values(data).returning().get();
  }

  getLocation(id: number, visitorId: string): Location | undefined {
    return db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.visitorId, visitorId)))
      .get();
  }

  getLocationsByVisitor(visitorId: string): Location[] {
    return db
      .select()
      .from(locations)
      .where(eq(locations.visitorId, visitorId))
      .orderBy(desc(locations.id))
      .all();
  }

  deleteLocation(id: number, visitorId: string): void {
    db.delete(locations)
      .where(and(eq(locations.id, id), eq(locations.visitorId, visitorId)))
      .run();
  }
}

export const storage = new DatabaseStorage();
