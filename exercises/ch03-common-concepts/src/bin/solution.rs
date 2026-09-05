fn celsius_to_fahrenheit(c: f64) -> f64 {
    c * 9.0 / 5.0 + 32.0
}

fn stats(readings: [f64; 5]) -> (f64, f64, f64) {
    let mut min = readings[0];
    let mut max = readings[0];
    let mut total = 0.0;
    for i in 0..readings.len() {
        let r = readings[i];
        if r < min {
            min = r;
        }
        if r > max {
            max = r;
        }
        total += r;
    }
    (min, max, total / readings.len() as f64)
}

fn main() {
    let celsius_readings = [0.0, 20.0, 37.0, 100.0, -40.0];

    let mut fahrenheit_readings = [0.0; 5];
    for i in 0..celsius_readings.len() {
        fahrenheit_readings[i] = celsius_to_fahrenheit(celsius_readings[i]);
    }

    let (min, max, avg) = stats(fahrenheit_readings);
    println!("min: {min}, max: {max}, avg: {avg}");

    assert_eq!(celsius_to_fahrenheit(100.0), 212.0);
}
