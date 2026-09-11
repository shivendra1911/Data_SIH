import subprocess
import sys

scenarios = [
    {
        "name": "Kedarnath 2013",
        "inputs": ["162.0", "95.0", "45.0", "12.0", "0.5"],
        "expected": "RED"
    },
    {
        "name": "Chamoli 2021 GLOF",
        "inputs": ["2.0", "40.0", "50.0", "10.0", "5.1"],
        "expected": "RED"
    },
    {
        "name": "Normal monsoon day",
        "inputs": ["15.0", "45.0", "20.0", "3.0", "0.0"],
        "expected": "GREEN"
    },
    {
        "name": "Heavy rain no flood",
        "inputs": ["80.0", "30.0", "5.0", "2.5", "0.0"],
        "expected": ["YELLOW", "ORANGE"]
    },
    {
        "name": "Nepal 2026 Langtang",
        "inputs": ["0.0", "35.0", "55.0", "11.0", "5.2"],
        "expected": "RED"
    },
    {
        "name": "False positive check",
        "inputs": ["0.0", "20.0", "3.0", "1.5", "6.0"],
        "expected": "GREEN"
    }
]

def run_scenarios():
    print("Running Batch Scenario Tests...\n")
    
    for s in scenarios:
        cmd = ["py", "predict_with_explanation.py"] + s["inputs"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            output = result.stdout
            
            # Extract alert color from output
            color_line = [line for line in output.split('\n') if "Alert Color:" in line]
            if color_line:
                color = color_line[0].split(":")[1].strip()
                
                expected = s["expected"]
                passed = False
                if isinstance(expected, list):
                    passed = color in expected
                else:
                    passed = color == expected
                    
                status = "PASS" if passed else "FAIL"
                print(f"[{status}] {s['name']}")
                if not passed:
                    print(f"  Expected: {expected}, Got: {color}")
            else:
                print(f"[ERROR] Could not parse output for {s['name']}")
                print(output)
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] Scenario {s['name']} failed to execute.")
            print(e.stderr)

if __name__ == "__main__":
    run_scenarios()
