export const QUANTUM_TRACK_ID = 'TRACK_QUANTUM_PQC';
export const QUANTUM_LESSONS = [
  { id: 'statevector', title: '1. Complex amplitudes and Bell correlations',
    firstPrinciples: 'A two-qubit pure state has four complex amplitudes. Their squared magnitudes sum to one. H on q0 followed by CX from q0 to q1 creates (|00> + |11>)/sqrt(2). Correlations do not allow faster-than-light messages. A local Rz gate changes phase without changing these basis probabilities.',
    localAnalogy: 'Heita, chommie: imagine two learners recording correlated results and comparing their notebooks afterwards. That helps explain matching results, but sealed envelopes alone cannot reproduce all quantum correlations. The analogy is limited; the amplitudes and measurement rules do the actual work.',
    source: 'https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information/entanglement-in-action' },
  { id: 'grover', title: '2. Oracle queries and Grover amplification',
    firstPrinciples: 'For one marked item among N possibilities, Grover uses O(sqrt(N)) oracle queries. It does not print every answer at once. For N=4, one ideal oracle-plus-diffusion iteration gives the marked state probability one. Extra iterations can reduce that probability. A classical statevector simulation still scales exponentially with qubits.',
    localAnalogy: 'Think of adjusting a pattern of waves so one marked outcome is reinforced while others cancel. It is not a taxi that visits every address instantly: building the oracle, running the circuit and checking the answer all have costs.',
    source: 'https://quantum.cloud.ibm.com/learning/en/courses/fundamentals-of-quantum-algorithms/grover-algorithm/number-of-iterations' },
  { id: 'qaoa', title: '3. Ising costs and p=1 QAOA',
    firstPrinciples: 'For spins zi in {-1,+1}, E(z)=sum Jij zi zj + sum hi zi. QAOA applies exp(-i gamma HC), then exp(-i beta sum Xi). Parameters are chosen classically. A shallow circuit or coarse parameter scan need not find the optimum; compare its expected energy with an exact small classical baseline.',
    localAnalogy: 'Picture sharing appliance loads between two feeders during planning: each appliance joins A or B. The cost measures imbalance under this simplified model. A good score does not certify a solar installation or prove a rand saving.',
    source: 'https://arxiv.org/abs/1411.4028' },
  { id: 'pqc', title: '4. Shor, Grover and post-quantum cryptography',
    firstPrinciples: 'Shor threatens factoring/discrete-log public-key schemes on sufficiently capable quantum hardware. Grover gives a generic quadratic search improvement. ML-KEM establishes a shared secret; ML-DSA signs messages. SHA-256 is a hash, not a signature or ML-KEM seal. Lattice security rests on studied hardness assumptions, not a proof of immunity. Implementing an algorithm does not make a module FIPS validated.',
    localAnalogy: 'A stokvel can use a hash to compare whether a record changed, encryption to keep it private, and a signature tied to a trusted key to check who signed. These are different jobs. A long-looking receipt number cannot replace any of them.',
    source: 'https://csrc.nist.gov/pubs/fips/203/final' },
  { id: 'qec', title: '5. Surface-code overhead and honest estimates',
    firstPrinciples: 'An ideal rotated planar patch uses d squared data qubits and d squared minus one syndrome ancillas. Real hardware needs additional routing and control resources. The displayed logical-error scaling is an illustrative approximation below an assumed threshold, not an exact decoder result. The threshold ratio is an input ratio, not a measured hardware suppression factor.',
    localAnalogy: 'More careful cross-checks can catch mistakes, but their benefit depends on how errors happen and how checks are interpreted. Counting extra checkers alone cannot guarantee a fault-free system.',
    source: 'https://arxiv.org/abs/1208.0928' },
] as const;

export const QISKIT_BELL_EXAMPLE = `# Run locally in a separately installed Qiskit environment; no cloud job.
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
qc = QuantumCircuit(2)
qc.h(0)
qc.cx(0, 1)
print(Statevector.from_instruction(qc))  # basis |q1 q0>
# Expected amplitudes: [1/sqrt(2), 0, 0, 1/sqrt(2)]
`;
