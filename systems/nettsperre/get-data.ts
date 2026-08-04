import { NETTSPERRE } from "../../config.js";
import { getMongoClient } from "../../lib/mongo-client.js";

const repackNettsperre = (sperre: any, user: any) => {
  return {
    id: sperre._id,
    status: sperre.status,
    currentStudent: sperre.students.find((stud: any) => stud.id === user.id),
    blockedGroup: sperre.blockedGroup.displayName,
    typeBlock: sperre.typeBlock.type,
    teacher: sperre.teacher.userPrincipalName,
    createdBy: sperre.createdBy.userPrincipalName,
    startBlock: sperre.startBlock,
    endBlock: sperre.endBlock,
    createdTimeStamp: sperre.createdTimeStamp
  };
};

export const getData = async (user: any, _system?: any) => {
  const client = await getMongoClient();
  const sperringerCollection = client.db(NETTSPERRE.DB_NAME).collection(NETTSPERRE.COLLECTION_NAME as string);

  const studentSperringer = await sperringerCollection.find({ "students.id": user.id, status: { $in: ["active", "pending"] } }).toArray();

  const activeNettsperrer = studentSperringer.filter((sperring: any) => sperring.status === "active");
  const futureNettsperrer = studentSperringer.filter((sperring: any) => sperring.status === "pending");

  return {
    activeNettsperrer: activeNettsperrer.map((sperring: any) => repackNettsperre(sperring, user)),
    futureNettsperrer: futureNettsperrer.map((sperring: any) => repackNettsperre(sperring, user))
  };
};
