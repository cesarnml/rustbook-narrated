// ch03 starter: temperature conversion + array/tuple stats. Fill in TODOs.

fn celsius_to_fahrenheit(c: f64) -> f64 {
    // TODO 1: implement the conversion (no return keyword needed — the
    // last expression in the function body, without a semicolon, is the
    // return value).
    0.0
}

fn stats(readings: [f64; 5]) -> (f64, f64, f64) {
    // TODO 2: return (min, max, average) as a tuple. Use a `for` loop over
    // the array to find min/max; don't reach for iterator adapters like
    // .iter().min() yet — those come in chapter 13.
    (0.0, 0.0, 0.0)
}

fn main() {
    let celsius_readings = [0.0, 20.0, 37.0, 100.0, -40.0];

    let mut fahrenheit_readings = [0.0; 5];
    for i in 0..celsius_readings.len() {
        fahrenheit_readings[i] = celsius_to_fahrenheit(celsius_readings[i]);
    }

    let (min, max, avg) = stats(fahrenheit_readings);
    println!("min: {min}, max: {max}, avg: {avg}");

    // TODO 3: 100.0 C should become exactly 212.0 F. Add a check with
    // `assert!` (or `assert_eq!`) that fails loudly if it doesn't, instead
    // of silently printing a wrong number.
}
