import torch
import torch.nn as nn

# Define ResNet9 architecture
def conv_block(in_channels, out_channels, pool=False):
    layers = [nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1),
              nn.BatchNorm2d(out_channels),
              nn.ReLU(inplace=True)]
    if pool:
        layers.append(nn.MaxPool2d(2))
    return nn.Sequential(*layers)

class ResNet9(nn.Module):
    def __init__(self, in_channels, num_classes):
        super().__init__()
        self.conv1 = conv_block(in_channels, 64)
        self.conv2 = conv_block(64, 128, pool=True)
        self.res1 = nn.Sequential(conv_block(128, 128), conv_block(128, 128))
        self.conv3 = conv_block(128, 256, pool=True)
        self.conv4 = conv_block(256, 512, pool=True)
        self.res2 = nn.Sequential(conv_block(512, 512), conv_block(512, 512))
        self.classifier = nn.Sequential(nn.MaxPool2d(4),
                                       nn.Flatten(),
                                       nn.Linear(512, num_classes))

    def forward(self, xb):
        out = self.conv1(xb)
        out = self.conv2(out)
        out = self.res1(out) + out
        out = self.conv3(out)
        out = self.conv4(out)
        out = self.res2(out) + out
        out = self.classifier(out)
        return out

# Load model with ResNet9 definition
model = torch.load('plant-disease-model-complete (1).pth', map_location='cpu', weights_only=False)
print("✅ Model loaded successfully!")
print(f"\nModel Type: {type(model).__name__}")

# Get model parameters from state dict
state_dict = model.state_dict()
print(f"Model has {len(state_dict)} parameter groups")

# Try to infer number of classes from the last layer
for key in state_dict.keys():
    if 'classifier' in key and 'weight' in key:
        shape = state_dict[key].shape
        print(f"\nFound classifier layer: {key}")
        print(f"Output shape: {shape}")
        num_classes = shape[0]
        print(f"Inferred number of classes: {num_classes}")
        break

# Print model architecture
print("\n" + "="*50)
print("MODEL ARCHITECTURE:")
print("="*50)
print(model)
