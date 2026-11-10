use std::io::{self, Read, Write};

use serde_json::Value;

pub const MAX_FRAME: u32 = 1024 * 1024;

pub fn read_frame<R: Read>(reader: &mut R) -> io::Result<Value> {
    let mut header = [0u8; 4];
    reader.read_exact(&mut header)?;
    let length = u32::from_le_bytes(header);
    if length == 0 || length > MAX_FRAME {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("frame length {length} outside 1..={MAX_FRAME}"),
        ));
    }
    let mut body = vec![0u8; length as usize];
    reader.read_exact(&mut body)?;
    serde_json::from_slice(&body)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))
}

pub fn write_frame<W: Write>(writer: &mut W, value: &Value) -> io::Result<()> {
    let body = serde_json::to_vec(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if body.is_empty() || body.len() > MAX_FRAME as usize {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("frame length {} outside 1..={MAX_FRAME}", body.len()),
        ));
    }
    writer.write_all(&(body.len() as u32).to_le_bytes())?;
    writer.write_all(&body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn frame_round_trip() {
        let mut bytes = Vec::new();
        write_frame(&mut bytes, &json!({"type":"hello","protocol":1})).unwrap();
        let value = read_frame(&mut bytes.as_slice()).unwrap();
        assert_eq!(value["type"], "hello");
        assert_eq!(value["protocol"], 1);
    }

    #[test]
    fn rejects_oversized_frame() {
        let mut bytes = Vec::from((MAX_FRAME + 1).to_le_bytes());
        bytes.push(0);
        assert!(read_frame(&mut bytes.as_slice()).is_err());
    }
}
