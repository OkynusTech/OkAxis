/**
 * CWE Database (Subset of common web vulnerabilities)
 */
export interface CWEEntry {
    id: string;
    name: string;
    description: string;
}

export const CWE_DATABASE: Record<string, CWEEntry> = {
    'CWE-79': {
        id: 'CWE-79',
        name: 'Improper Neutralization of Input During Web Page Generation (\'Cross-site Scripting\')',
        description: 'The software does not neutralize or incorrectly neutralizes user-controllable input before it is placed in output that is used as a web page that is served to other users.'
    },
    'CWE-89': {
        id: 'CWE-89',
        name: 'Improper Neutralization of Special Elements used in an SQL Command (\'SQL Injection\')',
        description: 'The software constructs all or part of an SQL command using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes that input before it is executed.'
    },
    'CWE-22': {
        id: 'CWE-22',
        name: 'Improper Limitation of a Pathname to a Restricted Directory (\'Path Traversal\')',
        description: 'The software uses external input to construct a pathname that is intended to identify a file or directory that is located underneath a restricted parent directory, but the software does not properly neutralize special elements within the pathname that can cause the pathname to resolve to a location that is outside of the restricted directory.'
    },
    'CWE-352': {
        id: 'CWE-352',
        name: 'Cross-Site Request Forgery (CSRF)',
        description: 'The web application does not, or can not, sufficiently verify whether a well-formed, valid, consistent request was intentionally provided by the user who submitted the request.'
    },
    'CWE-601': {
        id: 'CWE-601',
        name: 'URL Redirection to Untrusted Site (\'Open Redirect\')',
        description: 'A web application accepts a user-controlled input that specifies a link to an external site, and uses that input in a HTTP redirect. This can allow an attacker to launch a phishing scam and steal user credentials.'
    },
    'CWE-918': {
        id: 'CWE-918',
        name: 'Server-Side Request Forgery (SSRF)',
        description: 'A server-side request forgery (SSRF) attack involves an attacker sending a crafted request to a server-side application that the application then performs on behalf of the attacker.'
    },
    'CWE-20': {
        id: 'CWE-20',
        name: 'Improper Input Validation',
        description: 'The product receives input or data, but it does not validate or incorrectly validates that the input has the properties that are required to process the data safely and correctly.'
    },
    'CWE-78': {
        id: 'CWE-78',
        name: 'Improper Neutralization of Special Elements used in an OS Command (\'OS Command Injection\')',
        description: 'The software constructs all or part of an OS command using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes special elements that could modify the intended OS command when it is sent to a downstream component.'
    },
    'CWE-94': {
        id: 'CWE-94',
        name: 'Improper Control of Generation of Code (\'Code Injection\')',
        description: 'The software constructs all or part of a code segment using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes special elements that could modify the syntax or behavior of the intended code segment.'
    },
    'CWE-95': {
        id: 'CWE-95',
        name: 'Improper Neutralization of Directives in Dynamically Evaluated Code (\'Eval Injection\')',
        description: 'The software receives input from an upstream component, but it does not neutralize or incorrectly neutralizes code syntax before using the input in a dynamic evaluation call.'
    },
    'CWE-125': {
        id: 'CWE-125',
        name: 'Out-of-bounds Read',
        description: 'The software reads data past the end, or before the beginning, of the intended buffer.'
    },
    'CWE-119': {
        id: 'CWE-119',
        name: 'Improper Restriction of Operations within the Bounds of a Memory Buffer',
        description: 'The software performs operations on a memory buffer, but it can read from or write to a memory location that is outside of the intended boundary of the buffer.'
    },
    'CWE-787': {
        id: 'CWE-787',
        name: 'Out-of-bounds Write',
        description: 'The software writes data past the end, or before the beginning, of the intended buffer.'
    },
    'CWE-476': {
        id: 'CWE-476',
        name: 'NULL Pointer Dereference',
        description: 'A NULL pointer dereference occurs when the application dereferences a pointer that it expects to be valid, but is NULL, typically causing a crash or exit.'
    },
    'CWE-416': {
        id: 'CWE-416',
        name: 'Use After Free',
        description: 'Referencing memory after it has been freed can cause a program to crash, use unexpected values, or execute code.'
    },
    'CWE-415': {
        id: 'CWE-415',
        name: 'Double Free',
        description: 'The product calls free() twice on the same memory address, potentially leading to modification of unexpected memory locations.'
    },
    'CWE-200': {
        id: 'CWE-200',
        name: 'Exposure of Sensitive Information to an Unauthorized Actor',
        description: 'The product exposes sensitive information to an actor that is not explicitly authorized to have access to that information.'
    },
    'CWE-522': {
        id: 'CWE-522',
        name: 'Insufficiently Protected Credentials',
        description: 'The product transmits or stores authentication credentials, but it uses an insecure method that is susceptible to unauthorized interception and/or retrieval.'
    },
    'CWE-798': {
        id: 'CWE-798',
        name: 'Use of Hard-coded Credentials',
        description: 'The software contains hard-coded credentials, such as a password or cryptographic key, which it uses for its own inbound authentication, outbound communication to external components, or encryption of internal data.'
    },
    'CWE-259': {
        id: 'CWE-259',
        name: 'Use of Hard-coded Password',
        description: 'The software contains a hard-coded password, which it uses for its own inbound authentication or for outbound communication to external components.'
    },
    'CWE-327': {
        id: 'CWE-327',
        name: 'Use of a Broken or Risky Cryptographic Algorithm',
        description: 'The use of a broken or risky cryptographic algorithm is an unnecessary risk that may result in the exposure of sensitive information.'
    },
    'CWE-326': {
        id: 'CWE-326',
        name: 'Inadequate Encryption Strength',
        description: 'The software stores or transmits sensitive data using an encryption scheme that is theoretically sound, but is not strong enough for the level of protection required.'
    },
    'CWE-319': {
        id: 'CWE-319',
        name: 'Cleartext Transmission of Sensitive Information',
        description: 'The software transmits sensitive or security-critical data in cleartext in a communication channel that can be sniffed by unauthorized actors.'
    },
    'CWE-311': {
        id: 'CWE-311',
        name: 'Missing Encryption of Sensitive Data',
        description: 'The software does not encrypt sensitive or critical information before storage or transmission.'
    },
    'CWE-306': {
        id: 'CWE-306',
        name: 'Missing Authentication for Critical Function',
        description: 'The software does not perform any authentication for functionality that requires a provable user identity or consumes a significant amount of resources.'
    },
    'CWE-287': {
        id: 'CWE-287',
        name: 'Improper Authentication',
        description: 'When an actor claims to have a given identity, the software does not prove or insufficiently proves that the claim is correct.'
    },
    'CWE-862': {
        id: 'CWE-862',
        name: 'Missing Authorization',
        description: 'The software does not perform an authorization check when an actor attempts to access a resource or perform an action.'
    },
    'CWE-863': {
        id: 'CWE-863',
        name: 'Incorrect Authorization',
        description: 'The software performs an authorization check when an actor attempts to access a resource or perform an action, but it does not correctly perform the check. This allows attackers to bypass intended access restrictions.'
    },
    'CWE-284': {
        id: 'CWE-284',
        name: 'Improper Access Control',
        description: 'The software does not restrict or incorrectly restricts access to a resource from an unauthorized actor.'
    },
    'CWE-434': {
        id: 'CWE-434',
        name: 'Unrestricted Upload of File with Dangerous Type',
        description: 'The software allows the attacker to upload or transfer files of dangerous types that can be automatically processed within the product\'s environment.'
    },
    'CWE-502': {
        id: 'CWE-502',
        name: 'Deserialization of Untrusted Data',
        description: 'The application deserializes untrusted data without sufficiently verifying that the resulting data will be valid.'
    },
    'CWE-611': {
        id: 'CWE-611',
        name: 'Improper Restriction of XML External Entity Reference',
        description: 'The software processes an XML document that can contain XML entities with URIs that resolve to documents outside of the intended sphere of control, causing the product to embed incorrect documents into its output.'
    },
    'CWE-776': {
        id: 'CWE-776',
        name: 'Improper Restriction of Recursive Entity References in DTDs (\'XML Entity Expansion\')',
        description: 'The software uses XML documents and allows their structure to be defined with a Document Type Definition (DTD), but it does not properly control the number of recursive definitions of entities.'
    },
    'CWE-400': {
        id: 'CWE-400',
        name: 'Uncontrolled Resource Consumption',
        description: 'The software does not properly control the allocation and maintenance of a limited resource, thereby enabling an actor to influence the amount of resources consumed, eventually leading to the exhaustion of available resources.'
    },
    'CWE-770': {
        id: 'CWE-770',
        name: 'Allocation of Resources Without Limits or Throttling',
        description: 'The software allocates a reusable resource or group of resources on behalf of an actor without imposing any restrictions on the size or number of resources that can be allocated, in violation of the intended security policy for that actor.'
    },
    'CWE-798': {
        id: 'CWE-798',
        name: 'Use of Hard-coded Credentials',
        description: 'The software contains hard-coded credentials, such as a password or cryptographic key, which it uses for its own inbound authentication, outbound communication to external components, or encryption of internal data.'
    },
    'CWE-312': {
        id: 'CWE-312',
        name: 'Cleartext Storage of Sensitive Information',
        description: 'The application stores sensitive information in cleartext within a resource that might be accessible to another control sphere.'
    },
    'CWE-614': {
        id: 'CWE-614',
        name: 'Sensitive Cookie in HTTPS Session Without \'Secure\' Attribute',
        description: 'The Secure attribute for sensitive cookies in HTTPS sessions is not set, which could cause the user agent to send those cookies in plaintext over an HTTP session.'
    },
    'CWE-732': {
        id: 'CWE-732',
        name: 'Incorrect Permission Assignment for Critical Resource',
        description: 'The product specifies permissions for a security-critical resource in a way that allows that resource to be read or modified by unintended actors.'
    },
    'CWE-489': {
        id: 'CWE-489',
        name: 'Active Debug Code',
        description: 'The application is deployed with active debug code that can create unintended entry points or expose sensitive information.'
    },
    'CWE-209': {
        id: 'CWE-209',
        name: 'Generation of Error Message Containing Sensitive Information',
        description: 'The software generates an error message that includes sensitive information about its environment, users, or associated data.'
    },
    'CWE-532': {
        id: 'CWE-532',
        name: 'Insertion of Sensitive Information into Log File',
        description: 'Information written to log files can be of a sensitive nature and give valuable guidance to an attacker or expose sensitive user information.'
    },
    'CWE-295': {
        id: 'CWE-295',
        name: 'Improper Certificate Validation',
        description: 'The software does not validate, or incorrectly validates, a certificate.'
    },
    'CWE-347': {
        id: 'CWE-347',
        name: 'Improper Verification of Cryptographic Signature',
        description: 'The software does not verify, or incorrectly verifies, the cryptographic signature for data.'
    },
    'CWE-754': {
        id: 'CWE-754',
        name: 'Improper Check for Unusual or Exceptional Conditions',
        description: 'The software does not check or incorrectly checks for unusual or exceptional conditions that are not expected to occur frequently during day to day operation of the software.'
    },
    'CWE-916': {
        id: 'CWE-916',
        name: 'Use of Password Hash With Insufficient Computational Effort',
        description: 'The software generates a hash for a password, but it uses a scheme that does not provide a sufficient level of computational effort that would make password cracking attacks infeasible or expensive.'
    },
    'CWE-307': {
        id: 'CWE-307',
        name: 'Improper Restriction of Excessive Authentication Attempts',
        description: 'The software does not implement sufficient measures to prevent multiple failed authentication attempts within in a short time frame, making it more susceptible to brute force attacks.'
    },
    'CWE-269': {
        id: 'CWE-269',
        name: 'Improper Privilege Management',
        description: 'The software does not properly assign, modify, track, or check privileges for an actor, creating an unintended sphere of control for that actor.'
    },
    'CWE-190': {
        id: 'CWE-190',
        name: 'Integer Overflow or Wraparound',
        description: 'The software performs a calculation that can produce an integer overflow or wraparound, when the logic assumes that the resulting value will always be larger than the original value. This can introduce other weaknesses when the calculation is used for resource management or execution control.'
    },
    'CWE-191': {
        id: 'CWE-191',
        name: 'Integer Underflow (Wrap or Wraparound)',
        description: 'The product subtracts one value from another, such that the result is less than the minimum allowable integer value, which produces a value that is not equal to the correct result.'
    },
    'CWE-617': {
        id: 'CWE-617',
        name: 'Reachable Assertion',
        description: 'The product contains an assert() or similar statement that can be triggered by an attacker, which leads to an application exit or other behavior that is more severe than necessary.'
    },
    'CWE-835': {
        id: 'CWE-835',
        name: 'Loop with Unreachable Exit Condition (\'Infinite Loop\')',
        description: 'The program contains an iteration or loop with an exit condition that cannot be reached, i.e., an infinite loop.'
    },
    'CWE-669': {
        id: 'CWE-669',
        name: 'Incorrect Resource Transfer Between Spheres',
        description: 'The product does not properly transfer a resource/behavior to another sphere, or improperly imports a resource/behavior from another sphere, in a manner that provides unintended control over that resource.'
    },
    'CWE-494': {
        id: 'CWE-494',
        name: 'Download of Code Without Integrity Check',
        description: 'The product downloads source code or an executable from a remote location and executes the code without sufficiently verifying the origin and integrity of the code.'
    },
    'CWE-829': {
        id: 'CWE-829',
        name: 'Inclusion of Functionality from Untrusted Control Sphere',
        description: 'The software imports, requires, or includes executable functionality (such as a library) from a source that is outside of the intended control sphere.'
    },
    'CWE-345': {
        id: 'CWE-345',
        name: 'Insufficient Verification of Data Authenticity',
        description: 'The software does not sufficiently verify the origin or authenticity of data, in a way that causes it to accept invalid data.'
    },
    'CWE-426': {
        id: 'CWE-426',
        name: 'Untrusted Search Path',
        description: 'The application searches for critical resources using an externally-supplied search path that can point to resources that are not under the application\'s direct control.'
    },
    'CWE-427': {
        id: 'CWE-427',
        name: 'Uncontrolled Search Path Element',
        description: 'The product uses a fixed or controlled search path to find resources, but one or more locations in that path can be under the control of unintended actors.'
    },
    'CWE-706': {
        id: 'CWE-706',
        name: 'Use of Incorrectly-Resolved Name or Reference',
        description: 'The software uses a name or reference to access a resource, but the name/reference resolves to a resource that is outside of the intended control sphere.'
    },
    'CWE-611': {
        id: 'CWE-611',
        name: 'Improper Restriction of XML External Entity Reference',
        description: 'The software processes an XML document that can contain XML entities with URIs that resolve to documents outside of the intended sphere of control, causing the product to embed incorrect documents into its output.'
    },
    'CWE-917': {
        id: 'CWE-917',
        name: 'Improper Neutralization of Special Elements used in an Expression Language Statement (\'Expression Language Injection\')',
        description: 'The software constructs all or part of an expression language (EL) statement in a Java Server Page (JSP) using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes special elements that could modify the intended EL statement before it is executed.'
    },
    'CWE-91': {
        id: 'CWE-91',
        name: 'XML Injection (aka Blind XPath Injection)',
        description: 'The software does not properly neutralize special elements that are used in XML, allowing attackers to modify the syntax, content, or commands of the XML before it is processed by an end system.'
    },
    'CWE-643': {
        id: 'CWE-643',
        name: 'Improper Neutralization of Data within XPath Expressions (\'XPath Injection\')',
        description: 'The software uses external input to dynamically construct an XPath expression used to retrieve data from an XML database, but it does not neutralize or incorrectly neutralizes that input. This allows an attacker to control the structure of the query.'
    },
    'CWE-113': {
        id: 'CWE-113',
        name: 'Improper Neutralization of CRLF Sequences in HTTP Headers (\'HTTP Response Splitting\')',
        description: 'The software receives data from an HTTP agent/component (e.g., web server, proxy, browser, etc.), but it does not neutralize or incorrectly neutralizes CR and LF characters before the data is included in outgoing HTTP headers.'
    },
    'CWE-134': {
        id: 'CWE-134',
        name: 'Use of Externally-Controlled Format String',
        description: 'The software uses a function that accepts a format string as an argument, but the format string originates from an external source.'
    },
    'CWE-74': {
        id: 'CWE-74',
        name: 'Improper Neutralization of Special Elements in Output Used by a Downstream Component (\'Injection\')',
        description: 'The software constructs all or part of a command, data structure, or record using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes special elements that could modify how it is parsed or interpreted when it is sent to a downstream component.'
    },
    'CWE-77': {
        id: 'CWE-77',
        name: 'Improper Neutralization of Special Elements used in a Command (\'Command Injection\')',
        description: 'The software constructs all or part of a command using externally-influenced input from an upstream component, but it does not neutralize or incorrectly neutralizes special elements that could modify the intended command when it is sent to a downstream component.'
    },
    'CWE-88': {
        id: 'CWE-88',
        name: 'Improper Neutralization of Argument Delimiters in a Command (\'Argument Injection\')',
        description: 'The software constructs a string for a command to executed by a separate component in another control sphere, but it does not properly delimit the intended arguments, options, or switches within that command string.'
    },
    'CWE-73': {
        id: 'CWE-73',
        name: 'External Control of File Name or Path',
        description: 'The software allows user input to control or influence paths or file names that are used in filesystem operations.'
    },
    'CWE-384': {
        id: 'CWE-384',
        name: 'Session Fixation',
        description: 'Authenticating a user, or otherwise establishing a new user session, without invalidating any existing session identifier gives an attacker the opportunity to steal authenticated sessions.'
    },
    'CWE-613': {
        id: 'CWE-613',
        name: 'Insufficient Session Expiration',
        description: 'According to WASC, "Insufficient Session Expiration is when a web site permits an attacker to reuse old session credentials or session IDs for authorization."'
    },
    'CWE-521': {
        id: 'CWE-521',
        name: 'Weak Password Requirements',
        description: 'The product does not require that users should have strong passwords, which makes it easier for attackers to compromise user accounts.'
    },
    'CWE-640': {
        id: 'CWE-640',
        name: 'Weak Password Recovery Mechanism for Forgotten Password',
        description: 'The software contains a mechanism for users to recover or change their passwords without knowing the original password, but the mechanism is weak.'
    },
    'CWE-798': {
        id: 'CWE-798',
        name: 'Use of Hard-coded Credentials',
        description: 'The software contains hard-coded credentials, such as a password or cryptographic key, which it uses for its own inbound authentication, outbound communication to external components, or encryption of internal data.'
    },
    'CWE-922': {
        id: 'CWE-922',
        name: 'Insecure Storage of Sensitive Information',
        description: 'The software stores sensitive information without properly limiting read or write access by unauthorized actors.'
    },
    'CWE-401': {
        id: 'CWE-401',
        name: 'Missing Release of Memory after Effective Lifetime',
        description: 'The software does not sufficiently track and release allocated memory after it has been used, which slowly consumes remaining memory.'
    },
    'CWE-772': {
        id: 'CWE-772',
        name: 'Missing Release of Resource after Effective Lifetime',
        description: 'The software does not release a resource after its effective lifetime has ended, i.e., after the resource is no longer needed.'
    },
    'CWE-674': {
        id: 'CWE-674',
        name: 'Uncontrolled Recursion',
        description: 'The product does not properly control the amount of recursion that takes place, which consumes excessive resources, such as allocated memory or the program stack.'
    },
    'CWE-755': {
        id: 'CWE-755',
        name: 'Improper Handling of Exceptional Conditions',
        description: 'The software does not handle or incorrectly handles an exceptional condition.'
    },
    'CWE-248': {
        id: 'CWE-248',
        name: 'Uncaught Exception',
        description: 'An exception is thrown from a function, but it is not caught.'
    },
    'CWE-388': {
        id: 'CWE-388',
        name: 'Error Handling',
        description: 'Weaknesses in this category are related to improper handling of error conditions.'
    }
};

export const OWASP_TOP_10_2021 = [
    { id: 'A01:2025', name: 'Broken Access Control' },
    { id: 'A02:2025', name: 'Security Misconfiguration' },
    { id: 'A03:2025', name: 'Software Supply Chain Failures' },
    { id: 'A04:2025', name: 'Cryptographic Failures' },
    { id: 'A05:2025', name: 'Injection' },
    { id: 'A06:2025', name: 'Insecure Design' },
    { id: 'A07:2025', name: 'Authentication Failures' },
    { id: 'A08:2025', name: 'Software or Data Integrity Failures' },
    { id: 'A09:2025', name: 'Security Logging and Alerting Failures' },
    { id: 'A10:2025', name: 'Mishandling of Exceptional Conditions' },
];