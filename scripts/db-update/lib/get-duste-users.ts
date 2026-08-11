import type * as GraphTypes from "@microsoft/microsoft-graph-types";
import { logger } from "@vestfoldfylke/loglady";
import type { TestUser } from "../../../types/system-tests.js";
import type { Users } from "../types/graph.js";
import { getAllDeletedStudents, getAllEmployees, getAllStudents, getTeacherGroupMembers } from "./graph-requests.js";

const TENANT_NAME: string | undefined = process.env.APPREG_TENANT_NAME;
if (!TENANT_NAME) {
  throw new Error("Mangler tenantName i .env på rot");
}

const EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE: string | undefined = process.env.GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE;
if (!EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE) {
  throw new Error("Har du glemt å legge inn GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE i .env på rot mon tro?");
}

export const getDusteUsers = async (): Promise<TestUser[]> => {
  logger.info("Fetching members of teacher group");
  let teacherGroupMembers: Users;
  try {
    teacherGroupMembers = await getTeacherGroupMembers();
    logger.info("Got {TeacherGroupMemberCount} members of teacher group", teacherGroupMembers.count);
  } catch (err) {
    logger.errorException(err, "Failed when getting members of teacher group, will use empty array instead");
    teacherGroupMembers = { count: 0, value: [] };
  }

  logger.info("Fetching all employees");
  const employees: Users = await getAllEmployees();
  logger.info("Got {EmployeeCount} employees", employees.count);

  logger.info("Fetching all students");
  const students: Users = await getAllStudents();
  logger.info("Got {StudentCount} students", students.count);

  logger.info("Fetching all deleted students");
  const deletedStudents: Users = await getAllDeletedStudents();
  logger.info("Got {DeletedStudentCount} deleted students", deletedStudents.count);

  const allUsers: TestUser[] = [];
  logger.info("Repacking employees");
  for (const employee of employees.value) {
    const isTeacher: boolean = teacherGroupMembers.value.some((member: GraphTypes.User) => member.userPrincipalName === employee.userPrincipalName);
    const employeeNumberValue: string | null = (employee as Record<string, string | undefined>)[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE] ?? null;

    const user: TestUser = {
      ...employee,
      userType: "ansatt",
      isTeacher,
      feidenavn: isTeacher && employee.onPremisesSamAccountName ? `${employee.onPremisesSamAccountName}@${TENANT_NAME}.no` : null,
      samAccountName: employee.onPremisesSamAccountName,
      employeeNumber: employeeNumberValue
    } as TestUser;

    delete (user as Record<string, unknown>)[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE];

    allUsers.push(user);
  }

  logger.info("Repacking students");
  for (const student of students.value) {
    const upnPrefix: string = student.userPrincipalName?.substring(0, student.userPrincipalName.indexOf("@")) ?? "";
    const user: TestUser = {
      ...student,
      userType: "elev",
      feidenavn: `${upnPrefix}@${TENANT_NAME}.no`
    } as TestUser;

    if (student.jobTitle === "Lærling") {
      user.userType = "larling";
    } else if (student.jobTitle === "Elev-") {
      user.userType = "otElev";
    } else {
      user.userType = "elev";
    }

    allUsers.push(user);
  }

  logger.info("Repacking deleted students");
  for (const student of deletedStudents.value) {
    const upnSvada: string = student.id?.replaceAll("-", "") ?? "";
    const user: TestUser = {
      ...student,
      userPrincipalName: student.userPrincipalName?.substring(upnSvada.length) ?? "",
      userType: "slettaElev"
    } as TestUser;

    const upnPrefix: string = user.userPrincipalName.substring(0, user.userPrincipalName.indexOf("@"));
    user.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`;

    allUsers.push(user);
  }

  logger.info("Finished repacking users - returning all {UserCount} users", allUsers.length);
  return allUsers;
};
