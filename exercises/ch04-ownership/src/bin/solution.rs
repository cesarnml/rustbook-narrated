fn longest_word(s: &str) -> &str {
    let mut longest = "";
    for word in s.split_whitespace() {
        if word.len() > longest.len() {
            longest = word;
        }
    }
    longest
}

fn word_count(s: &str) -> usize {
    let mut count = 0;
    for _word in s.split_whitespace() {
        count += 1;
    }
    count
}

fn main() {
    let sentence = String::from("a rusty compiler outsmarts every careless programmer");

    println!("longest word: {}", longest_word(&sentence));
    println!("word count: {}", word_count(&sentence));
    println!("original still usable: {sentence}");
}
