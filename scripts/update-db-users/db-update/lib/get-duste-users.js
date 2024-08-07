const { join } = require('path')
require('dotenv').config({ path: join(__dirname, '../../../../.env') }) // User the same env as duste-kvern testene

const { logger } = require('@vtfk/logger')

const { writeFileSync } = require('fs')

const TENANT_NAME = process.env.APPREG_TENANT_NAME
if (!TENANT_NAME) throw new Error('Mangler tenantName i .env på rot')

const OT_DEPARTMENTS = (process.env.OT_DEPARTMENTS && process.env.OT_DEPARTMENTS.split(',')) || ['Grenland', 'Horten', 'Larvik', 'Sandefjord', 'Tønsberg', 'Vestmar', 'Vest-Telemark', 'Øst-Telemark']
const OT_DEPARTMENTS_LOWERCASE = OT_DEPARTMENTS.map(department => department.toLowerCase())

const EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE = process.env.GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE
if (!EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE) throw new Error('Har du glemt å legge inn GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE i .env på rot mon tro?')

const getDusteUsers = async () => {
  const { getAllEmployees, getTeacherGroupMembers, getAllStudents } = require('./graph-requests')

  logger('info', 'Fetching members of teacher group')
  const teacherGroupMembers = await getTeacherGroupMembers()
  logger('info', `Got ${teacherGroupMembers.count} members of teacher group`)

  logger('info', 'Fetching all employees')
  const employees = await getAllEmployees()
  logger('info', `Got ${employees.count} employees`)

  writeFileSync('./empliyee.json', JSON.stringify(employees, null, 2))

  logger('info', 'Fetching all students')
  const students = await getAllStudents()
  logger('info', `Got ${students.count} students`)

  const allUsers = []
  logger('info', 'Repacking employees')
  for (const employee of employees.value) {
    employee.userType = 'ansatt'
    employee.isTeacher = teacherGroupMembers.value.some(member => member.userPrincipalName === employee.userPrincipalName)
    employee.feidenavn = employee.isTeacher && employee.onPremisesSamAccountName ? `${employee.onPremisesSamAccountName}@${TENANT_NAME}.no` : null
    employee.samAccountName = employee.onPremisesSamAccountName
    delete employee.onPremisesSamAccountName
    employee.employeeNumber = employee[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE] || null
    delete employee[EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE]
    allUsers.push(employee)
  }
  logger('info', 'Repacking students')
  for (const student of students.value) {
    // If jobTitle lik lærling - is lærling
    // If department includes OT-department is OT kid
    // Else - is regular student
    const upnPrefix = student.userPrincipalName.substring(0, student.userPrincipalName.indexOf('@'))
    if (student.jobTitle === 'Lærling') {
      student.userType = 'larling'
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`
      allUsers.push(student)
    } else if (student.department && OT_DEPARTMENTS_LOWERCASE.includes(student.department.toLowerCase())) {
      student.userType = 'otElev'
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`
      allUsers.push(student)
    } else {
      student.userType = 'elev'
      student.feidenavn = `${upnPrefix}@${TENANT_NAME}.no`
      allUsers.push(student)
    }
  }
  logger('info', `Finished repacking users - returning all ${allUsers.length} users`)
  return allUsers
}

module.exports = { getDusteUsers }
