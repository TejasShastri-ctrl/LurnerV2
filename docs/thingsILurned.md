along the way with lurner

- jsonb in postgres optimizes for search and hence rearranges key-value pairs after storage

Hence a normalization function before comparing query results and question.expectedOutputs
this is not enough though, and I need to optimize query comparison. Comparing to a rigid pre-stated structure it not good and I am thinking of executing queries for expected outputs and then compare as well.
But then I could just write a script to do that for each question and store the outputs as static. Since the comparison would eventually mould into that output anyway. Yes this seems better

- worker threads spin up separate 10-40mb OS level thread instances of v8 engine in JS. They are not lightweight like C++ threads or something. Pooling is very important.

NAT-IP problem - By default, express-rate-limit tracks limits via the user's IP address (req.ip). Many users can share IP addresses though.
Have to use some other identifier, like a session cookie or the existing session ID perhaps. Then put out a spin-up time on each engine page startup? But then this would complicate stuff. What if a user refreshes the page or has multiple tabs open?
I will just use a common shared JWT for now(?)

