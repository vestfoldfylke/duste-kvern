import { logger } from "@vestfoldfylke/loglady";
import { getAllDeletedStudents, getAllEmployees, getAllStudents, getTeacherGroupMembers } from "./graph-requests.js";

const TENANT_NAME = process.env.APPREG_TENANT_NAME;
if (!TENANT_NAME) {
  throw new Error("Mangler tenantName i .env på rot");
}

const EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE = process.env.GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE;
if (!EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE) {
  throw new Error("Har du glemt å legge inn GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE i .env på rot mon tro?");
}

export const getDusteUsers = async (): Promise<any[]> => {
  logger.info("Fetching members of teacher group");
  let teacherGroupMembers: { value: any[]; count?: number };
  try {
    teacherGroupMembers = await getTeacherGroupMembers();
    logger.info("Got {TeacherGroupMemberCount} members of teacher group", teacherGroupMembers.count);
  } catch (err) {
    logger.errorException(err, "Failed when getting members of teacher group, will use empty array instead");
    teacherGroupMembers = { value: [] };
  }

  logger.info("Fetching all employees");
  const employees = await getAllEmployees();
  logger.info("Got {EmployeeCount} employees", employees.count);

  logger.info("Fetching all students");
  const students = await getAllStudents();
  logger.info("Got {StudentCount} students", students.count);

  logger.info("Fetching all deleted students");
  const deletedStudents = await getAllDeletedStudents();
  logger.info("Got {DeletedStudentCount} deleted students", deletedStudents.count);

  const allUsers: any[] = [];
  logger.info("Repacking employees");
  for (const employee of employees.value) {
    employee.userType = "ansatt";
    employee.isTeacher = teacherGroupMembers.value.some((member: any) => member.userPrincipalName === employee.userPrincipalName);
    employee.feidenavn = employee.isTeacher && employee.onPremisesSamAccountName ? `${employee.onPremisesSamAccountName}@${TENANT_NAME}.no` : null;
    employee.samAccountName = employee.onPremisesSamAccountName;

    employee.onPremisesSamAccountName = undefined;

    employee.employeeNumber = employee[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE] || null;

    employee[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE] = undefined;

    allUsers.push(employee);
  }

  logger.info("Repacking students");
  for (const student of students.value) {
    const upnPrefix = student.userPrincipalName.substring(0, student.userPrincipalName.indexOf("@"));
    if (student.jobTitle === "Lærling") {
      student.userType = "larling";
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`;
      allUsers.push(student);
    } else if (student.jobTitle === "Elev-") {
      student.userType = "otElev";
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`;
      allUsers.push(student);
    } else {
      student.userType = "elev";
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`;
      allUsers.push(student);
    }
  }

  logger.info("Repacking deleted students");
  for (const student of deletedStudents.value) {
    const upnSvada = student.id.replaceAll("-", "");
    student.userPrincipalName = student.userPrincipalName.substring(upnSvada.length);

    const upnPrefix = student.userPrincipalName.substring(0, student.userPrincipalName.indexOf("@"));
    student.userType = "slettaElev";
    student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`;
    allUsers.push(student);
  }

  logger.info("Finished repacking users - returning all {UserCount} users", allUsers.length);
  return allUsers;
};
