export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100, 1, 1]} />
      <meshStandardMaterial color="#22252b" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}
