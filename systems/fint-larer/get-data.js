const { getMsalToken } = require('../../lib/get-msal-token')
const { APPREG, FINTFOLK, FEIDE } = require('../../config')
const { callFintFolk } = require('../fint-ansatt/get-data')

const getData = async (user) => {
  // Hent et token
  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: FINTFOLK.SCOPE
  }
  const accessToken = await getMsalToken(clientConfig)

  const fintTeacher = await callFintFolk(`teacher/feidenavn/${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`, accessToken)

  return fintTeacher
}

module.exports = { getData, callFintFolk }
