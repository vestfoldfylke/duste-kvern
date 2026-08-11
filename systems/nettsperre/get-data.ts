import type { Collection, MongoClient, WithId } from "mongodb";
import { NETTSPERRE } from "../../config.js";
import { getMongoClient } from "../../lib/mongo-client.js";
import type { NettsperreRawData, NettsperreSystemData, NettsperreSystemDataObject } from "../../types/system-data.js";
import type { TestUser } from "../../types/system-tests.js";

const repackNettsperre = (sperre: NettsperreRawData, user: TestUser): NettsperreSystemDataObject => {
  return {
    id: sperre._id,
    status: sperre.status,
    currentStudent: sperre.students.find((stud: NettsperreRawData["students"][0]) => stud.id === user.id),
    blockedGroup: sperre.blockedGroup.displayName,
    typeBlock: sperre.typeBlock.type,
    teacher: sperre.teacher.userPrincipalName,
    createdBy: sperre.createdBy.userPrincipalName,
    startBlock: sperre.startBlock,
    endBlock: sperre.endBlock,
    createdTimeStamp: sperre.createdTimeStamp
  };
};

export const getData = async (user: TestUser): Promise<NettsperreSystemData> => {
  const client: MongoClient = await getMongoClient();
  const sperringerCollection: Collection<NettsperreRawData> = client.db(NETTSPERRE.DB_NAME).collection<NettsperreRawData>(NETTSPERRE.COLLECTION_NAME as string);

  const studentSperringer: WithId<NettsperreRawData>[] = await sperringerCollection.find({ "students.id": user.id, status: { $in: ["active", "pending"] } }).toArray();

  const activeNettsperrer: WithId<NettsperreRawData>[] = studentSperringer.filter((sperring: WithId<NettsperreRawData>) => sperring.status === "active");
  const futureNettsperrer: WithId<NettsperreRawData>[] = studentSperringer.filter((sperring: WithId<NettsperreRawData>) => sperring.status === "pending");

  return {
    activeNettsperrer: activeNettsperrer.map((sperring: WithId<NettsperreRawData>) => repackNettsperre(sperring, user)),
    futureNettsperrer: futureNettsperrer.map((sperring: WithId<NettsperreRawData>) => repackNettsperre(sperring, user))
  };
};
