async function test() {
    const BASE_URL = 'http://localhost:3000/api';
    
    async function login(email) {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        return await res.json();
    }

    async function getQuestions(token) {
        const res = await fetch(`${BASE_URL}/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    }

    console.log("Logging in as John Doe...");
    const data1 = await login('johndoe@mail.com');
    if (data1.error) {
        console.error("Login Error:", data1.error);
        return;
    }
    
    const questions1 = await getQuestions(data1.token);
    if (!Array.isArray(questions1)) {
        console.error("Questions fetch error:", questions1);
        return;
    }
    
    const q13 = questions1.find(q => q.id === 13);
    console.log("Q13 Progress for John Doe:", JSON.stringify(q13.progress, null, 2));

    process.exit(0);
}

test().catch(console.error);
